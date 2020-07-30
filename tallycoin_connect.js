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

// setup

const ws = new WebSocket('ws://10.0.0.7:8080/'); 
let server = require('http').createServer();
app.use(express.static(__dirname));
app.get('/', function(req, res){ res.sendFile(__dirname + '/setup.html'); });
server.on('request', app);

// read credentials before continuing

fs.readFile('tallycoin_api.key', 'utf8', function(err, contents) {
    keys = JSON.parse(contents);
    start_websocket(); // start connection to Tallycoin
});

// Write to config file when called

app.post('/save', jsonParser, function(request, response){
	
	fs.writeFile("tallycoin_api.key", JSON.stringify(request.body), (err) => {
	  if (err) console.log(err);
	  console.log("Written to Key File.");
	});
	
});

function lightning(type, data){

	const {lnd} = lnService.authenticatedLndGrpc({
		cert: keys['tls_cert'],
		macaroon: keys['macaroon'],
		socket: '127.0.0.1:10009',
	});

	if(type == 'payment_create'){

		lnService.createInvoice({lnd, description: data.description, tokens: data.amount}, (err, invoice) => {
			var invoice_id = invoice['id'];
			var request = invoice['request'];
			var unique_id = data.unique_id;

			ws.send(JSON.stringify({ "type": "payment_data", "id": invoice_id, "payment_request": request, "api_key": keys['tallycoin_api'], "unique_id": unique_id }));
		});

	}

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

function start_websocket(){
	wstimer = setInterval(function(){ 
		if(ws.readyState == 1){ 
				ws.send(JSON.stringify({ "ping": keys['tallycoin_api'] }));
		}
	}, 20000);

	ws.on('open', function open() {
	  ws.send(JSON.stringify({ "setup": keys['tallycoin_api'] }));
	});

	ws.on('close', function close() {
	  clearInterval(wstimer);
	});

	ws.on('message', function incoming(data) {
		var msg = JSON.parse(data);
		lightning(msg.type,msg);
		console.log(msg);
	});

}

server.listen(8123, function() { console.log('Ready.'); });
