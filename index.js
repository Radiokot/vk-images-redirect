const PORT = parseInt(process.env.PORT || 8031)
const ROUTE = '/r'
const DEFAULT_COUNTRY = 'US'
const GEOIP_PATH = 'GeoLite2-Country.mmdb'

const DEFAULT_REDIRECT = 'https://pp.userapi.com'
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
            redirect = DEFAULT_REDIRECT
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