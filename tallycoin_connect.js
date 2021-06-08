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

var ws; var wstimer;

// Create a server for transaction and setup pages

app.use(express.static(__dirname));
app.get('/', function(req, res){ res.sendFile(__dirname + '/index.html'); });
server.on('request', app);

// Retrieve invoice list


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



// Retrieve credentials via environment or from key file
let keys;
const { TALLYCOIN_APIKEY, LND_TLSCERT_PATH, LND_MACAROON_PATH } = process.env;

if (TALLYCOIN_APIKEY && LND_TLSCERT_PATH && LND_MACAROON_PATH) {
  keys = {
    tallycoin_api: TALLYCOIN_APIKEY,
    tls_cert: base64FromFile(LND_TLSCERT_PATH),
    macaroon: base64FromFile(LND_MACAROON_PATH)
  }

  fs.writeFileSync("tallycoin_api.key", JSON.stringify({ ...keys, from_env: true }));
} else {
  // reload API key every 30 seconds in case of update
  credentials();
  setInterval(credentials, 30000);

  // Write to key file when saved from setup page
  app.post('/save', jsonParser, function (request, response) {
    fs.writeFile("tallycoin_api.key", JSON.stringify(request.body), (err) => {
      if (err) console.log(err);
      console.log("Written to Key File.");
    });
  });
}

// start connection to Tallycoin server

start_websocket(); 

// Start on port 8123

server.listen(8123, function() { console.log('Ready.'); });

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

// FUNCTION: Websocket connection

function start_websocket(){
	console.log('starting websocket');

	clearInterval(wstimer);
	ws = new WebSocket('wss://ws.tallycoin.app:8123/'); 
	var restarting;

	// send setup message and API key every 20 seconds to keep a live connection

	ws.on('open', function open() {
		restarting = 'N';

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
		if(restarting != 'Y'){  
			restarting = 'Y';
			console.log('close websocket'); 
			setTimeout(function(){ start_websocket(); }, 10000);
		}
	});

	ws.on('error', function error(e) {
		clearInterval(wstimer);
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
