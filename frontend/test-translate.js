import https from 'https';

const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&q=Hello`;
    
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data:', data);
  });
}).on('error', (e) => {
  console.log('Error:', e.message);
});
