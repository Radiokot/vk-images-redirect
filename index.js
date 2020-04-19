const path = require('path')

const PORT = parseInt(process.env.PORT || 8031)
const ROUTE = '/r'
const DEFAULT_COUNTRY = 'US'
const GEOIP_PATH = path.join(__dirname, 'GeoLite2-Country.mmdb')
const UA_REDIRECT_UPDATE_INTERVAL_MS = 8 * 3600 * 1000

const PP_USERAPI = 'https://pp.userapi.com'
const REDIRECTS = {
    'UA': 'http://cs.cmle.ru/pp'
}

const http = require('http')
const ipCountry = require('ip-country')
const requestIp = require('request-ip')

ipCountry.init({
    mmdb: GEOIP_PATH,
    fallbackCountry: DEFAULT_COUNTRY,
    exposeInfo: false
})

const handler = (request, response) => {
    try {
        let url = request.url

        if (!url.startsWith(ROUTE)) {
            response.writeHead(404)
            response.end('Route not found')
            return
        }

        let payload = url.substring(url.indexOf(ROUTE) + ROUTE.length, url.length)

        let ip = clientIp = requestIp.getClientIp(request)
        let lookup = ipCountry.lookup(ip)
        
        let country = DEFAULT_COUNTRY

        if (lookup != null) {
            country = lookup.country.iso_code
        }

        let redirect = REDIRECTS[country]
        if (!redirect) {
            redirect = PP_USERAPI
        }

        response.writeHead(301, {
            'Location': redirect + payload
        })
        response.end()
    } catch (err) {
        console.error(err)
        try {
            response.writeHead(500)
            response.end('Internal server error')
        } catch(fatalErr) {
            console.error('Failed to send 500', fatalErr)
        }
    }
}

const server = http.createServer(handler)
server.listen(PORT, (err) => {
    if (err) {
        return console.log('Error during server init', err)
    }
    console.log(`Server is listening on ${PORT}`)
})

// Schedule UA redirect URL update
const updateUaRedirect = () => {
	let data = 'url=' + encodeURIComponent(PP_USERAPI)
	let options = {
		hostname: 'cameleo.xyz',
		path: '/r',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': data.length
		},
		timeout: 10000
	}
	
	let request = http.request(options, (error, response) => {
		if (error == null) {
			console.error(`UA redirect update failed: 302 error expected`)
			return
		}
		if (error.statusCode != 302) {
			console.error(`UA redirect update failed: invalid code ${error.statusCode}`)
			return
		}
		let headers = error.headers
		let location = headers ? headers.location : undefined
		if (!location) {
			console.error(`UA redirect update failed: expected location header`)
			return
		}
		REDIRECTS['UA'] = location
	})

	request.on('error', (error) => {
		console.error(`UA redirect update failed: ${error.message}`);
	});

	request.write(data)
	request.end()
}

updateUaRedirect()
console.log(`Scheduling UA redirect URL update at ${UA_REDIRECT_UPDATE_INTERVAL_MS} rate`)
setInterval(updateUaRedirect, UA_REDIRECT_UPDATE_INTERVAL_MS)