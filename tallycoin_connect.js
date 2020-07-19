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
		// data = [description,amount]
		lnService.createInvoice({lnd, description: "Hello there", tokens: 1000}, (err, invoice) => {
				var invoice_id = invoice['id'];
				var request = invoice['request'];

				console.log(invoice_id, request, invoice);
		});
	}

	if(type == 'getInvoice'){
		// data = id
		lnService.getInvoice({lnd, id: "5fa45d903188e8deaef2f1ac940457b35a7d2712f3f104feeff49b3032d3cd13"}, (err, invoice) => {
				var received = parseInt(invoice['received']); // amount received in satoshis
				var tokens = parseInt(invoice['tokens']); // amount requested in satoshis

				if(received >= tokens){ var status = 'paid'; }else{ var status = 'unpaid'; }

				console.log(data, status, invoice);
		});
	}

}


function start_websocket(){

	const ws = new WebSocket('wss://echo.websocket.org/', {
	  origin: 'https://websocket.org'
	});

	ws.on('open', function open() {
	  console.log('connected');
	  ws.send(Date.now());
	});

	ws.on('close', function close() {
	  console.log('disconnected');
	  lightning('getInvoice','hello'); // testing
	});

	ws.on('message', function incoming(data) {
	  console.log(`Roundtrip time: ${Date.now() - data} ms`);

			ws.close();
	 // setTimeout(function timeout() {
	//      ws.send(Date.now());
	 // }, 500);
	});

}
