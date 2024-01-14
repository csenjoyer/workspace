/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
	try {
		// Get the CF_Authorization cookie
		let cookie = request.headers.get('Cookie')
		
		// Check if the CF_Authorization cookie is present
		if (!cookie || !cookie.includes('CF_Authorization')) {
			throw new Error('CF_Authorization cookie not found')
		}

		let authorization = cookie.match(/CF_Authorization=([^;]+)/)[1]
		
		// Fetch identity information
		let identityResponse = await fetch(`https://secnerd.cloudflareaccess.com/cdn-cgi/access/get-identity`, {
			headers: { 'Cookie': `CF_Authorization=${authorization}` }
		})
		
		// Check if the fetch request was successful
		if (!identityResponse.ok) {
			throw new Error(`Fetch request failed with status ${identityResponse.status}`)
		}

		let identity = await identityResponse.json()
		
		// Get the location from the request
		let location = request.cf.country
		
		// Check if the request is for a country flag
		let url = new URL(request.url)
		let path = url.pathname
		if (path.startsWith('/secure/') && path.length > '/secure/'.length) {
			let country = path.slice('/secure/'.length)
			let flagResponse = await MY_BUCKET.get(country + '.png') // Fetch the flag image from the R2 bucket
			return new Response(flagResponse.body, { headers: { 'Content-Type': 'image/png' } })
		}
		
		// Create the response body
		let responseBody = `${identity.email} authenticated at ${new Date().toISOString()} from <a href="https://tunnel.secnerd.pro/secure/${location}">${location}</a>`
		
		// Return the response body
		return new Response(responseBody, { headers: { 'Content-Type': 'text/html' } })
	} catch (error) {
		// Return the error message
		return new Response(error.message, { status: 500 })
	}
}
