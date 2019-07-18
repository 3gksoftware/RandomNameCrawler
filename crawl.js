

const path = require('path')
const http = require('http')
const https = require('https')
const puppeteer = require("puppeteer")
const fs = require("fs")
const request = require("request")
const cheerio = require('cherio')
const axios = require('axios')
const util = require('util');
const csvwriterFactory = require('csv-writer').createObjectCsvWriter


/**
 *
 * @param filename URI du fichier
 * @returns {number} Taille en Byte(s)
 */
function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}


/**
 * Fonction de téléchargement (fonctionne uniquement sur des URLs public)
 *
 * @param url l'URL du fichier
 * @param dest l'URI sur le FS
 * @param cb la call back à appeler si une erreur se produit
 */
let download = function(url, dest, cb) {

    let proto = http
    if (url.match("^https")) {
        proto = https;
    }


    if (!fs.existsSync(path.dirname(dest))){
        fs.mkdirSync(path.dirname(dest));
    }

    let file = fs.createWriteStream(dest);
    let request = proto.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
            let fsize = getFilesizeInBytes(dest)
            if (fsize > 0) {
                console.log("File "+dest+" writen (size="+fsize+"B).");
            } else {
                if (fs.existsSync(dest))
                    fs.unlink(dest)
            }
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};


async function run() {

    const browser = await puppeteer.launch({
        headless: true,
        // slowMo: 10,
        devtools: true,
        ignoreHTTPSErrors: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],

    });
    const page = await browser.newPage();

    await page.setViewport({width:1600,height: 1200}); //Custom Width

    let address = [];

    page.on("console", msg => {
        for (let i = 0; i < msg.args.length; ++i)
            console.log(`${i}: ${msg.args[i]}`);
    });

    let data = []
    let url = []


    for (i=0;i<3000;i++) {
        url.push('https://www.behindthename.com/random/random.php?number=2&sets=5&gender=both&surname=&norare=yes&usage_fre=1')
    }


    let promises=[]



    let idx=1
    url.forEach(function (e,k) {


        promises.push(browser.newPage().then(async page => {
            try {
                await page.goto(e, { timeout: 0 });

                await page.setViewport({width:1600,height: 1200});

                let pageContent = await page.content()

                let $ = cheerio.load(pageContent)

                $(".heavyhuge").each(function(k,v) {
                    //console.log("prenom : " + $(this).find( "a:nth-child(1)").text(),+ "  // nom : "+$(this).find( "a:nth-child(2)").text())
                    data.push({
                        prenom: $(this).find( "a:nth-child(1)").text(),
                        nom: $(this).find( "a:nth-child(2)").text()
                    })
                })

                console.log("itération n°"+idx)

                idx++

                return Promise.resolve(1)

            } catch(e) {

                console.log(e)

                return Promise.reject(0)
            }

        }))
    })

    await Promise.all(promises)

    await browser.close();

    fs.writeFile("./export.json",JSON.stringify(data), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    })

    return Promise.resolve(1)

}

run();