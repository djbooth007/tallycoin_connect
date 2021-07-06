//////////////////////////////
// NODEJS TALLYCOIN CONNECT //
//////////////////////////////

// import

const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const app = express();
const fs = require("fs");
const WebSocket = require('ws');
const lnService = require('ln-service');
const server = require('http').createServer();
const shajs = require('sha.js')

var ws; var wstimer; let keys; var connected = 'N'; var users = [];

// Create a server for transaction and setup pages

app.set('trust proxy', true);

app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function(req, res){
	if(users.includes(req.ip) || keys['tallycoin_passwd'] == '' || keys['tallycoin_passwd'] == null){
		res.sendFile(__dirname + '/index.html');
	}else{
		res.sendFile(__dirname + '/login.html');
	}
});

server.on('request', app);

// Retrieve invoice list from LND
app.post('/list', jsonParser, function(request, response){

	var {lnd} = lnService.authenticatedLndGrpc({
		cert: keys['tls_cert'],
		macaroon: keys['macaroon'],
		socket: '127.0.0.1:10009',
	});

	lnService.getInvoices({lnd}, (err, invoices) => {
		response.json(invoices);
	});

});

// Confirm sync connection to Tallycoin server
app.post('/sync', jsonParser, function(request, response){
	var lnd_status = 'Y';
	if(keys['macaroon'] == '' || keys['tls_cert'] == '' || keys['tls_cert'] == null || keys['macaroon'] == null){ lnd_status = 'N'; }
	response.json({ 'sync': connected, 'api': keys['tallycoin_api'], 'lnd': lnd_status, 'from_env': keys['from_env'] });
});

// Login when password is set
app.post('/login', jsonParser, function(request, response){
	var passwd = passwd_hash(request.body.passwd);
	if(passwd == keys['tallycoin_passwd']){
		var login_state = 'Y';
		users.push(request.ip);
	}else{
		var login_state = 'N';
	}
	response.json({ 'login_state' : login_state });
});

// Save API from setup page
app.post('/save_api', jsonParser, function (request, response) {
	keys['tallycoin_api'] = request.body.api;
	write_key();
});

// Save password from setup page
app.post('/save_passwd', jsonParser, function (request, response) {
	var passwd = passwd_hash(request.body.passwd);
	keys['tallycoin_passwd'] = passwd;
	write_key();
});


// Retrieve credentials via environment or from key file
const {
  TALLYCOIN_APIKEY,
  TALLYCOIN_PASSWD,
  LND_TLSCERT_PATH,
  LND_MACAROON_PATH,
  PORT = 8123
} = process.env;

if(TALLYCOIN_APIKEY && TALLYCOIN_PASSWD && LND_TLSCERT_PATH && LND_MACAROON_PATH){
	keys = {
		tallycoin_api: TALLYCOIN_APIKEY,
		tallycoin_passwd: TALLYCOIN_PASSWD,
		tls_cert: base64FromFile(LND_TLSCERT_PATH),
		macaroon: base64FromFile(LND_MACAROON_PATH),
		from_env: true
	}

	fs.writeFileSync("tallycoin_api.key", JSON.stringify(keys));

} else {

  // reload API key every 30 seconds in case of update
  credentials();
  setInterval(credentials, 30000);
}

// start connection to Tallycoin server

start_websocket();

// Start server

server.listen(PORT, function () { console.log(`Running on http://localhost:${PORT}`); });

// FUNCTION: Read key file

function credentials(){
	fs.readFile('tallycoin_api.key', 'utf8', function(err, contents) {
		keys = JSON.parse(contents);
	});
}

function base64FromFile(file){
  const content = fs.readFileSync(file);
  return Buffer.from(content).toString('base64');
}

// FUNCTION: Write key file

function write_key(){
    fs.writeFile("tallycoin_api.key", JSON.stringify(keys), (err) => {
      if (err) console.log(err);
      console.log("Written to Key File.");
    });
}

// FUNCTION: Hash Password

function passwd_hash(text){
	return shajs('sha256').update(text).digest('hex');
}

// FUNCTION: Websocket connection

function start_websocket(){
	console.log('starting websocket');

	clearInterval(wstimer);
	ws = new WebSocket('wss://ws.tallycoin.app:8123/');
	var restarting;

	// send setup message and API key every 20 seconds to keep a live connection

	ws.on('open', function open() {
		restarting = 'N';  connected = 'Y';

		ws.send(JSON.stringify({ "setup": keys['tallycoin_api'] }));

		wstimer = setInterval(function(){
			if(ws.readyState == 1){
				ws.send(JSON.stringify({ "ping": keys['tallycoin_api'] }));
			}
		}, 20000);

	});

	// Parse incoming message

	ws.on('message', function incoming(data) {
		var msg = JSON.parse(data);
		lightning(msg.type,msg);
	});

	// Error handling. Try reconnect every 10 seconds.

	ws.on('close', function close(e) {
		clearInterval(wstimer);
		connected = 'N';
		if(restarting != 'Y'){
			restarting = 'Y';
			console.log('close websocket');
			setTimeout(function(){ start_websocket(); }, 10000);
		}
	});

	ws.on('error', function error(e) {
		clearInterval(wstimer);
		connected = 'N';
		if(restarting != 'Y'){
			restarting = 'Y';
			setTimeout(function(){ start_websocket(); }, 10000);
		}
	});
}

// FUNCTION: Parse incoming messages and reply to Tallycoin server

function lightning(type, data){

	// credentials for LND.

	var {lnd} = lnService.authenticatedLndGrpc({
		cert: keys['tls_cert'],
		macaroon: keys['macaroon'],
		socket: '127.0.0.1:10009',
	});

	// When message 'payment_create' received, get fresh invoice from LND and send response to Tallycoin server

	if(type == 'payment_create'){

		lnService.createInvoice({lnd, is_including_private_channels: true, description: data.description, tokens: data.amount}, (err, invoice) => {
			var invoice_id = invoice['id'];
			var request = invoice['request'];
			var unique_id = data.unique_id;

			ws.send(JSON.stringify({ "type": "payment_data", "id": invoice_id, "payment_request": request, "api_key": keys['tallycoin_api'], "unique_id": unique_id }));
		});

	}

	// When message 'payment_verify' received, check payment status of specific invoice with LND and send response to Tallycoin server

	if(type == 'payment_verify'){

		lnService.getInvoice({lnd, id: data.inv_id}, (err, invoice) => {
			var received = parseInt(invoice['received']); // amount received in satoshis
			var tokens = parseInt(invoice['tokens']); // amount requested in satoshis
			var unique_id = data.unique_id;

			if(received >= tokens){ var status = 'paid'; }else{ var status = 'unpaid'; }

			ws.send(JSON.stringify({ "type": "payment_verify", "id": invoice['id'], "status": status, "amount": tokens, "api_key": keys['tallycoin_api'], "unique_id": unique_id }));
		});
	}

}
