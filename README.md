# Tallycoin Connect

![screenshot](https://tallyco.in/img/tallycoin_connect_screenshot3.png)

**Decentralize the money.**

Install Tallycoin Connect on a bitcoin node to allow for the retrieval of lightning invoices via [Tallycoin](https://tallycoin.app). LND required.

## Setup

```sh
# Download Tallycoin Connect
git clone https://github.com/djbooth007/tallycoin_connect
cd tallycoin_connect

## Install dependencies
npm install

## Install Tallycoin Connect
python3 setup.py
```

## Docker

Alternatively, you can run the app as a Docker container:

```sh
# Build the image
docker build -t tallycoin_connect .

# Start the container
docker run -ti -p 8123:8123 tallycoin_connect
```

You can pass the credentials and file paths using these environment variables:

- `TALLYCOIN_APIKEY`
- `LND_TLSCERT_PATH`
- `LND_MACAROON_PATH`

## Enter API Key

Visit http://localhost:8123/ (replace 'localhost' with your actual hostname)

## NOTE: Where to Find API Key

Login to https://tallycoin.app and navigate to the Admin Dashboard, then Node Connect.

Generate an API Key and copy it. Go back to your node and enter the key.

Back on the Tallycoin Node Connect page, test your connection. This may take up to 1 minute for connection to sync.
