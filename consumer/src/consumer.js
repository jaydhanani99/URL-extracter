const { Kafka } = require('kafkajs');
const axios = require('axios');
const cheerio = require('cheerio');
const tldjs = require('tldjs');
const mongoose = require('mongoose');
const validUrl = require('valid-url');

const kafka = new Kafka({
    clientId: 'url-consumer',
    brokers: ['kafka:9092']
})
mongoose.connect('mongodb://mongodb:27017/mydatabase');
const ExternalUrlSchema = new mongoose.Schema({
  url: String,
  externalUrls: [String]
});
const ExternalUrl = mongoose.model('ExternalUrl', ExternalUrlSchema);

const consumer = kafka.consumer({ groupId: 'url-group' })
const producer = kafka.producer()

const visitedUrls = new Set();

const runConsumer = async () => {
    await consumer.connect();
    await producer.connect();
    await consumer.subscribe({ topic: 'URLFetch', fromBeginning: true});

    await consumer.run({
        eachMessage: async ({ topic, partition, message}) => {
            const data = JSON.parse(message.value.toString())
            const url = data.url;
            const baseUrl = data.baseUrl;
            const externalUrls = [];
            if (visitedUrls.has(url)) {
                return;
            }

            visitedUrls.add(url);

            console.log(`Processing URL: ${url}` );
            try {
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);

                // Only visiting the URL from the same domain
                const baseDomain = tldjs.getDomain(new URL(baseUrl).hostname);
                // const baseDomain = new URL(url).hostname;

                $('a').each(async (i, link) => {
                    const href = $(link).attr('href');
                    if (href && !visitedUrls.has(href) && validUrl.isUri(href)) {
                        if (baseDomain == tldjs.getDomain(new URL(href).hostname)) {
                            await producer.send({
                                topic: 'URLFetch',
                                messages: [{ value: JSON.stringify({ url: href, baseUrl }) }]
                            })
                        }
                        else {
                            externalUrls.push(href);
                        }
                    }
                });
                // Update or create a document for the base URL
                await ExternalUrl.findOneAndUpdate(
                    { url },
                    { url, externalUrls },
                    { upsert: true, new: true }
                );
            } catch (error) {
                console.error('Failed to fetch URL: ', error.message)
            }
        }
    })
}

runConsumer().catch(console.error)