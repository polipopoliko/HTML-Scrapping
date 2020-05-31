// html scrapper library
const cheerio = require('cheerio');
// http request library
const axios = require('axios').default;
// write to file library
const fs = require('fs');

// base url
const baseUrl = "https://www.bankmega.com/";
// promo page
const promoUrl = 'promolainnya.php?'
var subcat = 1

// array to store subcategory
var promoCategoryList = []
// available subcategory as per 28 May 2020
// 1 = liburan
// 2 = belanja
// 3 = makan
// 4 = sehat
// 5 = cantik
// 6 = etc

// 2 dimensional array to store the scrapped html data in json form
var scrappedJson = []

// custom print format function
function printScrappedJson() {
    for (i = 0; i < promoCategoryList.length; i++) {
        console.log('\n==============================\n')
        console.log(promoCategoryList[i] + "\n")
        scrappedJson[i].forEach((el) => {
            console.log(el)
        })
        console.log('\n==============================\n')
    }
}

async function loadPage(page) {
    try {
        // load promo page based on product, subcat, and page
        // 1 is for credit card promotion only
        const { data } = await axios.get(baseUrl + promoUrl + 1 + '&subcat=' + subcat + '&page=' + page);
        // return promo page as cheeriostatic
        return cheerio.load(data)
    } catch (e) {
        console.log(e);
        return null;
    }
}

function getAndInitializeTitle(promo) {
    // initialize category title and index 
    promo.forEach((el, idx) => {
        scrappedJson[idx] = [];
        promoCategoryList.push(el.attribs.id)
    });
}

async function coverPromoAttribs(promos) {
    var promiseDetailFunc = []
    var jason = []
    promos.forEach((el) => {
        const detailUrl = baseUrl + el.attribs.href
        const imgUrl = baseUrl + el.children[1].attribs.src

        promiseDetailFunc.push(scrapePromoDetail(detailUrl).then((val) => {
            // format include detail_url, cover_image, and promo_detail
            // jason.push({
            //     "detail_url": detailUrl,
            //     "cover_image": imgUrl,
            //     "promo_detail": val
            // })
            
            // format as per instruction 
            jason.push(val)
        }))
    })
    // wait all promise to finish
    await Promise.all(promiseDetailFunc)
    return Promise.resolve(jason)
}

async function scrapePromoDetail(url) {
    try {
        const { data } = await axios.get(url)
        const $ = cheerio.load(data)("body #contentpromolain2");
        var periode = $.find('.periode')[0].childNodes[0].data.trim()

        // loop through and get data inside tag b
        $.find('.periode b').get().forEach((el) => {
            periode += " " + el.children[0].data
        })

        // console.log({
        //     title: $.find('.titleinside>h3')[0].children[0].data,
        //     area: $.find('.area')[0].childNodes[0].data + $.find('.area')[0].childNodes[1].childNodes[0].data,
        //     periode: periode,
        //     detail_image: $.find('.keteranganinside>img')[0].attribs.src
        // })
        return {
            title: $.find('.titleinside>h3')[0].children[0].data,
            area: $.find('.area')[0].childNodes[0].data + $.find('.area')[0].childNodes[1].childNodes[0].data,
            periode: periode,
            detail_image: baseUrl + $.find('.keteranganinside>img')[0].attribs.src.substring(1)
        }
    } catch (e) {
        // return empty array if error
        return []
    }
}

function reformatJson () {
    // reformat json from double dimensional array to required json format
    var newJson = {}
    for (i =0; i < promoCategoryList.length; i++) {
        category = promoCategoryList[i];
        newJson[category] = scrappedJson[i]
    }
    return newJson
}

function writeJsonToFile () {
    // write formatted json to a file named solution with json extension
    var jsonString = JSON.stringify(reformatJson()) 
    fs.writeFile('solution.json', jsonString, 'utf8', () => {console.log("Finish writing to solution.json")})
}

// main function
var main = async () => {
    console.log('begin function main')
    try {
        // loop through subcategory
        do {
            console.log("subcat " + subcat)
            page = 1
            // loop through each subcategory's page
            while(true) {
                console.log('page ' + page)

                const $ = await loadPage(page)

                // initialize category on first loop
                if (subcat - 1 == 0 && page == 1)
                    getAndInitializeTitle($('#subcatpromo div img').get())
                
                // break the loop if the current page doesn't have promo available
                // else scrape the promo
                if ($('#promolain li a').get().length <= 0)
                    break 
                else
                    await coverPromoAttribs($('#promolain li a').get()).then((val) => {
                        scrappedJson[subcat - 1] = scrappedJson[subcat - 1].concat(val)
                });
                // increment page
                page+=1
        }
        // increment subcat
        subcat += 1
        } while (subcat - 1 < promoCategoryList.length);
    } catch (e) {
        console.error(e)
    }
    printScrappedJson()
    writeJsonToFile()
    console.log('end of function main')
}

main();
