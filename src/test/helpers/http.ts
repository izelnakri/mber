import http from 'http';

export default {
  get(uri) {
    return new Promise((resolve, reject) => {
      http.get(uri, (res) => {
        const contentType = res.headers['content-type'];
        let rawData = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            if (/^application\/json/.test(contentType)) {
              return resolve(JSON.parse(rawData));
            }

            resolve(rawData);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => reject(error));
    })
  }
}
