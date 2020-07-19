const fs = require("fs");

// read credentials before continuing

fs.readFile('tallycoin.key', 'utf8', function(err, contents) {

        // set up LND connection

        keys = JSON.parse(contents)

        const lnService = require('ln-service');

        const {lnd} = lnService.authenticatedLndGrpc({
          cert: keys['tls_cert'],
          macaroon: keys['macaroon'],
          socket: '127.0.0.1:10009',
        });

        // Create an Invoice

        lnService.createInvoice({lnd, description: "Hello there", tokens: 1000}, (err, invoice) => {
                var invoice_id = invoice['id'];
                var request = invoice['request'];

                console.log(invoice_id, request, invoice);
        });



/*
        // Read an Invoice

        lnService.getInvoice({lnd, id: "5fa45d903188e8deaef2f1ac940457b35a7d2712f3f104feeff49b3032d3cd13"}, (err, invoice) => {
                var received = parseInt(invoice['received']); // amount received in satoshis
                var tokens = parseInt(invoice['tokens']); // amount requested in satoshis

                if(received >= tokens){ var status = 'paid'; }else{ var status = 'unpaid'; }

                console.log(status, invoice);
        });
*/

});



const WebSocket = require('ws');

const ws = new WebSocket('wss://echo.websocket.org/', {
  origin: 'https://websocket.org'
});

ws.on('open', function open() {
  console.log('connected');
  ws.send(Date.now());
});

ws.on('close', function close() {
  console.log('disconnected');
});

ws.on('message', function incoming(data) {
  console.log(`Roundtrip time: ${Date.now() - data} ms`);

  setTimeout(function timeout() {
    ws.send(Date.now());
  }, 500);
});
