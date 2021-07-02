//
// TALLYCOIN CONNECT //
//

var connect = function(){
	
	var json = {}; var last_id = ''; var all_count = 0; var paid_count = 0; var unpaid_count = 0;
	
	this.init = function(){
				
		var xhr_api = new XMLHttpRequest();
		xhr_api.onload = function() { 
			if(this.response !== null){ json = this.response; connect.check_key(); }
		} 	
		xhr_api.open( 'GET', 'tallycoin_api.key' );
		xhr_api.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr_api.responseType = 'json';
		xhr_api.send();	

		if(localStorage.getItem("tcc_status_pref") == null){ localStorage.setItem("tcc_status_pref",'all'); }
	}
	
	this.retrieve_list = function(){

		var xhr_list = new XMLHttpRequest();
		xhr_list.onload = function() { 		
			if(this.response !== null){ 
				var list = JSON.parse(this.response); 
				connect.insert_list(list.invoices); 
			}
		} 
		xhr_list.open("POST", '/list', true);
		xhr_list.setRequestHeader('Content-Type', 'application/json');
		xhr_list.send();
	}
	
	this.insert_list = function(list){
		
		all_count = 0; paid_count = 0; unpaid_count = 0; paid_sats_total = 0;
		document.getElementById('invoice_list').innerHTML = '';
		
		Object.values(list).forEach(invoice => {
					
			var description = invoice['description'];
			
			if(description.includes("Tallycoin")){
				
				var received = parseInt(invoice['received']); // amount received in satoshis
				var tokens = parseInt(invoice['tokens']); // amount requested in satoshis
				if(received >= tokens){ 
					var status = 'paid'; var dotbg = 'green;'; var fc = ' whitefont'; 	
					paid_count++;	paid_sats_total += received;			
				}else{ 
					var status = 'unpaid'; var dotbg = '#fdc948;'; var fc = ' greyfont';
					unpaid_count++;					
				}
				all_count++;
				
				// notify new paid transaction
				if(paid_count == 1 && last_id != invoice['id'] && last_id != '' && status == 'paid'){ last_id = invoice['id']; connect.new_transaction_received(); }				

				// insert into table
				if(status == 'paid'){ var amount = received.toString(); }else{ var amount = tokens.toString(); }								
				if(paid_count == 1 && last_id == ''){ last_id = invoice['id']; }
				
				connect.insert_table_row(status,invoice['id'],dotbg,fc,invoice['created_at'],amount,description);
			}
		});

		connect.insert_table_row('','','','','','','');
		
		document.getElementById('paid_sats_total').innerHTML = connect.format_number(paid_sats_total);
		
		connect.change_status(localStorage.getItem("tcc_status_pref"));	
	}
	
	this.insert_table_row = function(status,invoice_id,dotbg,fc,created_at,amount,description){
		
		// create table row
		var tr = document.createElement("tr");
		tr.dataset.status = status;
		tr.dataset.inv_id = invoice_id;
		
		// cell 1
		var td = document.createElement("td");
		td.classList = 'column1';
		if(dotbg != ''){ td.innerHTML = '<span class="dot" style="background-color:'+dotbg+'"></span>'; }
		tr.appendChild(td);

		// cell 2
		var td = document.createElement("td");		
		td.classList = 'column2'+fc;
		if(created_at != ''){
			var t = document.createTextNode(connect.format_date(created_at));
			td.appendChild(t);
		}
		tr.appendChild(td);
		
		// cell 3
		var td = document.createElement("td");
		td.classList = 'column3'+fc;
		if(amount != ''){
			var t = document.createTextNode(connect.format_number(amount));
			td.appendChild(t);
		}
		tr.appendChild(td);
		
		// cell 4
		var td = document.createElement("td");
		td.classList = 'column4'+fc;
		if(description == ''){ 
			td.innerHTML = '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;'; 
		}else{
			var t = document.createTextNode(description);
			td.appendChild(t);
		}
		tr.appendChild(td);
		
		// add to table
		document.getElementById('invoice_list').append(tr);		
	}
	
	this.update_tx_count = function(){
		var pref = localStorage.getItem("tcc_status_pref");
		if(pref == 'all'){ document.getElementById('inv_count').innerHTML = all_count; }
		if(pref == 'paid'){ document.getElementById('inv_count').innerHTML = paid_count; }
		if(pref == 'unpaid'){ document.getElementById('inv_count').innerHTML = unpaid_count; }	
	}
	
	this.new_transaction_received = function(){
		document.title = '(NEW) Tallycoin Connect';
		setTimeout(function(){ document.title = 'Tallycoin Connect'; },1000);
		setTimeout(function(){ document.title = '(NEW) Tallycoin Connect'; },1500);
		setTimeout(function(){ document.title = 'Tallycoin Connect'; },2500);
		setTimeout(function(){ document.title = '(NEW) Tallycoin Connect'; },3000);
		setTimeout(function(){ document.title = 'Tallycoin Connect'; },20000);
		var audio = document.getElementById("sfx");	audio.play();
	}
	
	this.format_date = function(date){
		date = new Date(date);
		year = date.getFullYear();
		month = date.getMonth()+1;
		dt = date.getDate();

		if (dt < 10) {  dt = '0' + dt; }
		if (month < 10) { month = '0' + month; }

		var hours = ((date.getHours() < 10)?"":"") + ((date.getHours()>12)?(date.getHours()-12):date.getHours());
		if(hours == 0 && ((date.getHours()>=12)?('PM'):'AM') == 'AM'){ hours = 12; }
		var time = hours +":"+ ((date.getMinutes() < 10)?"0":"") + date.getMinutes() + " " + ((date.getHours()>=12)?('PM'):'AM');
		return year+'-' + month + '-'+dt+' '+time;			
	}
	
	this.change_status = function(status){
		var table = document.getElementById("invoice_list");
		for (var i = 0, row; row = table.rows[i]; i++) {
			row.style.display = 'inherit';
			if(status == 'paid' && row.dataset.status == 'unpaid'){ row.style.display = 'none'; }
			if(status == 'unpaid' && row.dataset.status == 'paid'){ row.style.display = 'none'; }
		}
		
		localStorage.setItem("tcc_status_pref",status);
		
		radiobtn = document.getElementById("inv_status_"+status); radiobtn.checked = true;
		connect.update_tx_count();
	}
	
	this.format_number = function(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	
		
	this.lnd_setup_error = function(){
		document.getElementById('error').style.display = 'block';
	}

	this.saved = function(){
		document.getElementById('saved').style.display = 'block';
		setTimeout(function(){ document.getElementById('saved').style.display = 'none'; },5000);
	}
	
	this.open_setup = function(){
		document.getElementById('setup').style.display = 'block';
		document.getElementById('invoice-table').style.display = 'none';
	}
	
	this.open_invoices = function(){
		document.getElementById('setup').style.display = 'none';
		document.getElementById('invoice-table').style.display = 'block';	
	}


	this.check_key = function(){
		if(json.tallycoin_api != ""){
			document.getElementById('api_key').value = json.tallycoin_api;
			if(json.from_env == true){
				document.getElementById('api_key').setAttribute('readonly', true);
				document.getElementById('save_api_key').style.display = 'none';
			}
			connect.retrieve_list(); setInterval(function(){ connect.retrieve_list(); }, 30000);
		}
		if(json.tls_cert == "" || json.macaroon == "" || json.tls_cert === undefined || json.macaroon === undefined){ connect.lnd_setup_error(); }
	}
	
	this.submit_api = function(){
		var api_key = document.getElementById('api_key').value;
		json.tallycoin_api = api_key;
		
		var xhr = new XMLHttpRequest();
		xhr.open("POST", '/save', true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(JSON.stringify(json));	

		connect.saved();
	}	

}