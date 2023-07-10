const { Client, NoAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

const message = fs.readFileSync('./message.txt', { encoding: 'utf-8' });
const contacts = [];

function readContactsFromFile() {
  return new Promise((resolve, reject) => {
    fs.createReadStream('contacts.csv')
      .pipe(csv())
      .on('data', (data) => {
        try {
          contacts.push(data.number);
        } catch (err) {
          console.error(err);
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

let counter = { fails: 0, success: 0 };

const client = new Client({
  authStrategy: new NoAuth(),
});

async function authenticate() {
  return new Promise((resolve) => {
    client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      resolve();
    });

    client.on('auth_failure', (msg) => {
      console.error('AUTHENTICATION FAILURE', msg);
    });

    client.initialize();
  });
}

function sendMessageWithDelay(client, contact, message, delayDuration) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const finalNumber = contact.length > 10 ? `${contact}@c.us` : `91${contact}@c.us`;
      const isRegistered = await client.isRegisteredUser(finalNumber);
      if (isRegistered) {
        const msg = await client.sendMessage(finalNumber, message);
        console.log(`${contact} Sent`);
        counter.success++;
      } else {
        console.log(`${contact} Failed`);
        counter.fails++;
      }
      resolve();
    }, delayDuration);
  });
}

async function deployAll(client, contacts, message, batchSize, delayDuration) {
  const batches = [];
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    batches.push(batch);
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map((contact) => sendMessageWithDelay(client, contact, message, delayDuration))
    );
  }

  console.log(`Result: ${counter.success} sent, ${counter.fails} failed`);
}

(async function main() {
  try {
    await readContactsFromFile('contacts.csv');
    await authenticate();

    console.log('Client is ready!');
    await deployAll(client, contacts, message, 5, 5000); // Batch size of 5, delay of 5 seconds
    console.log('Process completed.');
  } catch (err) {
    console.error('An error occurred:', err);
  }
})();
