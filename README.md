# External URL Catcher

## Steps to Run:

- `docker-compose up`
- Visit URL to fetch external URLs recursively: http://localhost:3005/fetch-urls?url=https://openai.com
- Visit URL to display the fetched URLs: http://localhost:3005/urls?url=https://openai.com

## Tech

- [Apache Kafka] - Consumes URL from the same domain.
- [MongoDB] - To store external URLs corresponds to the input URL.
- [Node.js] - API Endpoint.
- [Express] - fast node.js network app framework.