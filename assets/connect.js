let connect = function () {
  let last_id = '', all_count = 0, paid_count = 0, unpaid_count = 0
  var locale_format = { "decimal": ".", "thousand": "," }

  this.init = () => {
	
	connect.set_locale();	
	  
    const xhr_api = new XMLHttpRequest()
    xhr_api.onload = function () {
      if (this.response !== null) {
        connect.check_key(this.response)
      }
    }
    xhr_api.open('POST', 'sync')
    xhr_api.setRequestHeader('Content-Type', 'application/json')
    xhr_api.responseType = 'json'
    xhr_api.send()

    if (localStorage.getItem('tcc_status_pref') == null) {
      localStorage.setItem('tcc_status_pref', 'all')
    }
  }
  
  // TRANSACTION LIST
  
  this.retrieve_list = () => {
    const xhr_list = new XMLHttpRequest()
    xhr_list.onload = function () {
      const json = JSON.parse(this.response)
      if (json.error) {
        connect.lnd_setup_error(json.error)
      } else {
        connect.insert_list(json.invoices)
      }
    }
    xhr_list.open('POST', 'list', true)
    xhr_list.setRequestHeader('Content-Type', 'application/json')
    xhr_list.send()
  }

  this.insert_list = list => {
    all_count = 0
    paid_count = 0
    unpaid_count = 0
    paid_sats_total = 0
    document.getElementById('invoice_list').innerHTML = ''

    Object.values(list).forEach(invoice => {
      let description = invoice['description']

      if (description.includes('Tallycoin')) {
		description = description.replace("#Tallycoin",""); // remove hashtag  
        const received = parseInt(invoice['received']) // amount received in satoshis
        const tokens = parseInt(invoice['tokens']) // amount requested in satoshis
        let status, dotbg, fc
        if (received >= tokens) {
          status = 'paid'
          dotbg = 'green'
          fc = ' whitefont'
          paid_count++
          paid_sats_total += received
        } else {
          status = 'unpaid'
          dotbg = '#fdc948'
          fc = ' greyfont'
          unpaid_count++
        }
        all_count++

        // notify new paid transaction
        if (paid_count == 1 && last_id != invoice['id'] && last_id != '' && status == 'paid') {
          last_id = invoice['id']
          connect.new_transaction_received()
        }

        // insert into table
        const amount = status == 'paid' ? received.toString() : tokens.toString()
        if (paid_count == 1 && last_id == '') {
          last_id = invoice['id']
        }

        connect.insert_table_row(status, invoice['id'], dotbg, fc, invoice['created_at'], amount, description)
      }
    })

    document.getElementById('paid_sats_total').innerHTML = connect.format_number(paid_sats_total)
    connect.change_status(localStorage.getItem('tcc_status_pref'))
  }

  this.insert_table_row = (status, invoice_id, dotbg, fc, created_at, amount, description) => {
    // create table row
    const tr = document.createElement('tr')
    tr.dataset.status = status
    tr.dataset.inv_id = invoice_id

    // cell 1
    let td = document.createElement('td')
    td.classList = 'column1'
    if (dotbg != '') {
      td.innerHTML = `<span class="dot" style="background-color:${dotbg}"></span>`
    }
    tr.appendChild(td)

    // cell 2
    td = document.createElement('td')
    td.classList = `column2${fc}`
    if (created_at != '') {
      const t = document.createTextNode(connect.format_date(created_at))
      td.appendChild(t)
    }
    tr.appendChild(td)

    // cell 3
    td = document.createElement('td')
    td.classList = `column3${fc}`
    if (amount != '') {
      const t = document.createTextNode(connect.format_number(amount))
      td.appendChild(t)
    }
    tr.appendChild(td)

    // cell 4
    td = document.createElement('td')
    td.classList = `column4${fc}`
    if (description !== '') {
      const t = document.createTextNode(description)
      td.appendChild(t)
    }
    tr.appendChild(td)

    // add to table
    document.getElementById('invoice_list').append(tr)
  }

  this.update_tx_count = () => {
    const pref = localStorage.getItem('tcc_status_pref')
    if (pref == 'all') { document.getElementById('inv_count').innerHTML = all_count }
    if (pref == 'paid') { document.getElementById('inv_count').innerHTML = paid_count }
    if (pref == 'unpaid') { document.getElementById('inv_count').innerHTML = unpaid_count }
  }

  this.new_transaction_received = () => {
    document.title = '(NEW) Tallycoin Connect'
    setTimeout(() => { document.title = 'Tallycoin Connect' }, 1000)
    setTimeout(() => { document.title = '(NEW) Tallycoin Connect' }, 1500)
    setTimeout(() => { document.title = 'Tallycoin Connect' }, 2500)
    setTimeout(() => { document.title = '(NEW) Tallycoin Connect' }, 3000)
    setTimeout(() => { document.title = 'Tallycoin Connect' }, 20000)

    const audio = document.getElementById('sfx')
    audio.play()
  }

  this.change_status = status => {
    const table = document.getElementById('invoice_list')
    for (let i = 0, row; row = table.rows[i]; i++) {
      row.style.display = 'table-row'
      if (
        status == 'paid' && row.dataset.status == 'unpaid' ||
        status == 'unpaid' && row.dataset.status == 'paid'
      ) {
        row.style.display = 'none'
      }
    }

    localStorage.setItem('tcc_status_pref', status)

    radiobtn = document.getElementById(`inv_status_${status}`)
    radiobtn.checked = true
    connect.update_tx_count()
  }
  
  // FORMATTING

  this.format_date = date => {
    date = new Date(date)
    year = date.getFullYear()
    month = date.getMonth() + 1
	months = ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    dt = date.getDate()

    let hours = ((date.getHours() < 10) ? '' : '') + ((date.getHours() > 12) ? (date.getHours() - 12) : date.getHours())
    if (hours == 0 && ((date.getHours() >= 12) ? ('PM') : 'AM') == 'AM') { hours = 12 }

    const time = `${hours}:${((date.getMinutes() < 10) ? '0' : '')}${date.getMinutes()} ${date.getHours() >= 12 ? 'PM' : 'AM'}`
    return `${dt} ${months[month]} ${year} ${time}`
  }
 
  this.set_locale = function(){
	var test_str = parseFloat(1234.56).toLocaleString()

	if (test_str.match("1")){ 
		locale_format.decimal = test_str.replace(/.*4(.*)5.*/, "$1")
		locale_format.thousand = test_str.replace(/.*1(.*)2.*/, "$1")
	}
  }

  this.locale_formatting = function(num){	
	// transform number to localised format
	var num = num.toString()
	if(num.indexOf(".") > 0){ num = num.replace(".",locale_format.decimal); }

	// split number by integer and decimal
	var d = num.split(locale_format.decimal)	
	var integer = d[0].toString().replaceAll(locale_format.thousand,"")

	var reconstructed = integer.replaceAll(/\B(?=(\d{3})+(?!\d))/g, locale_format.thousand)		
	return reconstructed;
  }	
  
  this.format_number = x => {
	  x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '')
	  return connect.locale_formatting(x)
  }

  // CONFIG

  this.lnd_setup_error = errorDetails => {
    document.getElementById('error').style.display = 'block'
    document.getElementById('errorDetails').innerText = errorDetails
    document.getElementById('sync').style.color = '#bb0000'
  }
  
  this.saved_api = () => {
    document.getElementById('saved_api').style.display = 'inline-block'
    setTimeout(location.reload, 5000)
  }

  this.saved_passwd = () => {
    document.getElementById('saved_passwd').style.display = 'inline-block'
    setTimeout(location.reload, 5000)
  }

  this.open_page = (name) => {
    document.getElementById('setup').style.display = 'none'
    document.getElementById('transactions').style.display = 'none'
    document.getElementById(name).style.display = 'block'
  }

  this.check_key = json => {
    if (json.api != '') {
      document.getElementById('api_key').value = json.api
      connect.retrieve_list()
      setInterval(connect.retrieve_list, 30000)
    }

    connect.sync_status(json)
  }

  this.sync_status = json => {
    let color = '#bb0000'
    if (json.sync == 'Y' && json.lnd == 'Y' && json.api != '') {
      color = 'green'
    }
    document.getElementById('sync').style.color = color
  }

  this.submit_api = () => {
    const api = document.getElementById('api_key').value
    const xhr = new XMLHttpRequest()

    xhr.open('POST', 'save_api', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify({ api }))

    connect.saved_api()
  }

  this.submit_passwd = () => {
    const passwd = document.getElementById('passwd').value
    const xhr = new XMLHttpRequest()

    xhr.open('POST', 'save_passwd', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify({ passwd }))

    connect.saved_passwd()
  }

  this.check_enter = (e, type) => {
    if (e.keyCode === 13) {
      e.preventDefault()
      if (type == 'passwd') { connect.submit_passwd() }
      if (type == 'api') { connect.submit_api() }
    }
  }
}
