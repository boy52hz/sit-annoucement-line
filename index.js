const puppeteer = require('puppeteer')
const axios = require('axios')
const qs = require('querystring')
const CronJob = require('cron').CronJob
const fs = require('fs')

const url = 'https://www.sit.kmutt.ac.th/pr-visitor/'

async function newestAnnoucement() {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(url)

	const annouces = await page.$('.panel-title')
	const titleProp = await annouces.getProperty('innerText')
	const hrefProp = await annouces.getProperty('href')
	const title = await titleProp.jsonValue()
	const href = await hrefProp.jsonValue()
	browser.close()
	
    return { title, href }
}

let lastAnnouce = require('./store.json')

const cronJob = new CronJob('0 */10 * * * *', async() => {
	console.log('[Scrapping] Checking for new Annoucement...')

	const annouce = await newestAnnoucement()
	if (annouce.title === lastAnnouce.title) {
		console.log('[Scrapping] nothing to update')	
		return
	}
	console.log('[SIT-Annoucer] Sending new annoucement')
	const reqBody = { 
		message : `${annouce.title}\n\nอ่านรายละเอียด: ${decodeURI(annouce.href)}`
	}

	const axiosConfig = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': `Bearer <token-here>`
		}
	}

	axios.post('https://notify-api.line.me/api/notify', 
		qs.stringify(reqBody), 
		axiosConfig
	).then(res => {
		console.log('[SIT-Annoucer] New annoucement sended')
		const newAnnouce = {
			title: annouce.title,
			href: annouce.href
		}
		lastAnnouce = newAnnouce
		fs.writeFileSync('./store.json', JSON.stringify(newAnnouce))
	}).catch(err => {
		console.log(err);
	})
})

cronJob.start()