const fs = require("fs");
const WebSocket = require('ws');
const lnService = require('ln-service');

// read credentials before continuing

fs.readFile('tallycoin.key', 'utf8', function(err, contents) {
    keys = JSON.parse(contents);
    start_websocket(); // start connection to Tallycoin

});


function lightning(type, data){

	const {lnd} = lnService.authenticatedLndGrpc({
		cert: keys['tls_cert'],
		macaroon: keys['macaroon'],
		socket: '127.0.0.1:10009',
	});

	if(type == 'createInvoice'){

		lnService.createInvoice({lnd, description: data.description, tokens: data.amount}, (err, invoice) => {
			var invoice_id = invoice['id'];
			var request = invoice['request'];

			ws.send(JSON.stringify({ "type": "payment_data", "id": invoice_id, "payment_request": request }));
		});

	}

	if(type == 'getInvoice'){

		lnService.getInvoice({lnd, id: data}, (err, invoice) => {
			var received = parseInt(invoice['received']); // amount received in satoshis
			var tokens = parseInt(invoice['tokens']); // amount requested in satoshis

			if(received >= tokens){ var status = 'paid'; }else{ var status = 'unpaid'; }

			ws.send(JSON.stringify({ "type": "payment_verify", "id": invoice['id'], "status": status }));
		});
	}

}


const ws = new WebSocket('wss://connect.tallycoin.app:8080/'); 

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
		
		if(msg.type == 'payment_verify'){ lightning('getInvoice',msg.id);	} 

		if(msg.type == 'payment_create'){ lightning('createInvoice',msg);	} 

	});

}
