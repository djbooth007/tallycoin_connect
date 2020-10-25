# Tallycoin Connect

![screenshot](https://tallyco.in/img/tallycoin_connect_screenshot2.png)

**Decentralize the money.** 

Install Tallycoin Connect on a bitcoin node to allow for the retrieval of lightning invoices via [Tallycoin](https://tallycoin.app). LND required.

## Download Tallycoin Connect

`cd /home/admin/`

`git clone https://github.com/djbooth007/tallycoin_connect`

`cd tallycoin_connect`

## Install Websocket

`sudo npm install ws`

## Install LN-Service

`sudo npm install ln-service`

[ For more info: https://github.com/alexbosworth/ln-service ]

## Install Tallycoin Connect

`sudo python3 setup.py`

## Enter API Key

Visit http://localhost:8123/ (replace 'localhost' with your actual hostname)

## NOTE: Where to Find API Key

Login to https://tallycoin.app and navigate to the Admin Dashboard, then Node Connect.

Generate an API Key and copy it. Go back to your node and enter the key. 

Back on the Tallycoin Node Connect page, test your connection. This may take up to 1 minute for connection to sync.
