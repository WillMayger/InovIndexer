const google        = require('googleapis');
const key           = require('./My Project-85b35e4ee577.json');
const drive         = google.drive('v3');
const request       = require('request');
const fs       = require('fs');

export class GoogleAPI {

  constructor() {
    this.basefolder = '0B2Mgsut58AMxczAweEJYMHNOOXc';
    this.auth = new google.auth.JWT(
    	key.client_email,
    	null,
    	key.private_key,
    	[
    		'https://www.googleapis.com/auth/drive',
    		'https://www.googleapis.com/auth/drive.file'
    	],
    	null
    );
  }

  Auth() {
    return new Promise((resolve, reject) => {
      this.auth.authorize( (err, tokens) => {
        if (err) {
          console.log(err);
          reject();
        }

        console.log("Authorised with Google API.")
        resolve();
      });
    });
  }

  CreateFile(fileName, parentsArray=this.basefolder, typeMIME) {
    // example of saving file from url
    //

    typeMIME = typeMIME === 'pdf' ? 'application/pdf' : 'audio/mp3';

    let fileMetadata = {
      'name': fileName,
      parents: parentsArray
    };

    (function() {
      request('https://secure-hwcdn.libsyn.com/p/a/9/d/a9d3d05d0d4a577d/LI_S2L2_011314_fpod101.mp3?c_id=6469581&expiration=1504278078&hwt=d00c3819a2485521eeea8192c6376c4e')
      .pipe(fs.createWriteStream('lessons/' + fileName));
    }.bind(this))();

      let media = {
        mimeType: typeMIME,
        uploadType: 'resumable',
        body: fs.createReadStream('lessons/' + fileName)
      };

      drive.files.create({
        auth: this.auth,
        resource: fileMetadata,
        uploadType: 'resumable',
        media: media,
        fields: 'id',

      }, function(err, file) {
        fs.unlinkSync('lessons/' + fileName);

        if(err) {
          // Handle error
          // console.log(err);
        } else {
          console.log('File Id: ', file.id);
        }
      });


  }

  CreateFolder(folderName, parentsArray=this.basefolder) {
    return new Promise((resolve, reject) => {
      let fileMetadata = {
        'name' : folderName,
        'mimeType' : 'application/vnd.google-apps.folder',
        parents: parentsArray
      };
      drive.files.create({
        resource: fileMetadata,
        auth: this.auth,
        fields: 'id'
      }, function(err, file) {
        if(err) {
          console.log(err);
          reject(err);
        }
        resolve(file.id);
      });
    });
  }
}
