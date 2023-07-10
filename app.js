const { Client, NoAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');

const message = fs.readFileSync("./message.txt", { encoding: 'utf-8' });
const contacts = [];

fs.createReadStream('contacts.csv')
  .pipe(csv())
  .on('data', function (data) {
    try {
      contacts.push(data.number);
    } catch (err) {
      console.error(err);
    }
  })
  .on('end', () => {
    // console.log(contacts);
  });

let counter = { fails: 0, success: 0 }

const client = new Client({
  authStrategy: new NoAuth()
});

client.initialize();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('auth_failure', msg => {
  console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
  console.log('Client is ready!');
  deploy_all();
});

client.on('disconnected', (reason) => {
  console.log('Client was logged out', reason);
});

async function deploy_all() {
  for (const contact of contacts) {
    const final_number = (contact.length > 10) ? `${contact}@c.us` : `91${contact}@c.us`;
    const isRegistered = await client.isRegisteredUser(final_number);
    if (isRegistered) {
      const msg = await client.sendMessage(final_number, message);
      console.log(`${contact} Sent`);
      counter.success++;
      await delay(5000); // 5-second delay
    } else {
      console.log(`${contact} Failed`);
      counter.fails++;
    }
  }
  console.log(`Result: ${counter.success} sent, ${counter.fails} failed`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
