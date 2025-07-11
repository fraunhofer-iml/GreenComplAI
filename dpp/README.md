# Getting Startet

## BaSyx
Switch do the BaSyx folder in the terminal run
```shell
docker compose up
```
This will start all BaSyx components. Port of the UI is 3007.

## DPP UI
Switch to dpp-ui folder in another terminal and run
```shell
npm start
```
This will start the UI. Port is 3004.

Open a browser tab and go to
```shell
localhost:3004
```
Click on `Management`. Type in

`http://localhost` for BaSyx URL

`8081` for BaSyx Port

Choose the respective files under `../core/dpp/sampledata`. `lawn-mower` and `Klemmbeschlag` are currently working AAS.
