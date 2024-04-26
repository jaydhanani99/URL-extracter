const express = require('express');
const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');

const app = express();
const PORT = 3005;

const kafka = new Kafka({
  clientId: 'url-producer',
  brokers: ['kafka:9092']
});

mongoose.connect('mongodb://mongodb:27017/mydatabase');
const ExternalUrlSchema = new mongoose.Schema({
  url: String,
  externalUrls: [String]
});
const ExternalUrl = mongoose.model('ExternalUrl', ExternalUrlSchema);

const producer = kafka.producer();

const runProducer = async () => {
  await producer.connect();
}

runProducer().catch(error => console.error("Error while connecting producer"))

app.use(express.json());

app.get('/fetch-urls', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({error: 'Missing URL in request parameter'})

  try {
    await producer.send({
      topic: 'URLFetch',
      messages: [{ value: JSON.stringify({ url: url, baseUrl: url }) }]
    });

    res.status(200).json({ message: 'URL processing started'})
  } catch (error) {
    console.log('Error sending URL to kafka');
    res.status(500).json({ error: 'Failed to send URL to kafka'})
  }
})

app.get('/urls', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({error: 'Missing URL in request parameter'})

  try {
    const result = await ExternalUrl.findOne({ url });
    if (result) {
      res.json(result.externalUrls);
    } else {
      res.status(404).json({ error: 'No external URLs found for the provided base URL.' });
    }
  } catch (error) {
    res.status(500).send("Error retrieving external URLs" + error.message);
  }
})

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))