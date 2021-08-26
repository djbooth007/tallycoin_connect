let connect = function () {
  let last_id = '', all_count = 0, paid_count = 0, unpaid_count = 0

  this.init = () => {
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
    document.getElementById('fullwidth').style.width = window.innerWidth
  }

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
      const description = invoice['description']

      if (description.includes('Tallycoin')) {
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

    connect.insert_table_row('', '', '', '', '', '', '')
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
    if (description == '') {
      td.innerHTML = '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;'
    } else {
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

  this.format_date = date => {
    date = new Date(date)
    year = date.getFullYear()
    month = date.getMonth() + 1
    dt = date.getDate()

    if (dt < 10) {
      dt = '0' + dt
    }
    if (month < 10) {
      month = '0' + month
    }

    let hours = ((date.getHours() < 10) ? '' : '') + ((date.getHours() > 12) ? (date.getHours() - 12) : date.getHours())
    if (hours == 0 && ((date.getHours() >= 12) ? ('PM') : 'AM') == 'AM') {
      hours = 12
    }
    const time = `${hours}:${((date.getMinutes() < 10) ? '0' : '')}${date.getMinutes()} ${date.getHours() >= 12 ? 'PM' : 'AM'}`
    return `${year}-${month}-${dt} ${time}`
  }

  this.change_status = status => {
    const table = document.getElementById('invoice_list');
    for (let i = 0, row; row = table.rows[i]; i++) {
      row.style.display = 'inherit'
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

  this.format_number = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

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

  this.open_setup = () => {
    document.getElementById('setup').style.display = 'block'
    document.getElementById('invoice-table').style.display = 'none'
  }

  this.open_invoices = () => {
    document.getElementById('setup').style.display = 'none'
    document.getElementById('invoice-table').style.display = 'block'
  }

  this.check_key = json => {
    if (json.api != '') {
      document.getElementById('api_key').value = document.getElementById('api_key_readonly').textContent = json.api
      if (json.from_env == true) {
        document.getElementById('settings-file').style.display = 'none'
      } else {
        document.getElementById('settings-env').style.display = 'none'
      }
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
