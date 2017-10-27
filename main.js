const Apify = require('apify');
const request = require('request-promise');
const _ = require('underscore');
const toCSV = require('array-to-csv')

Apify.main(async () => {
    const { crawlers, keyValueStores } = Apify.client;
    const input = await Apify.getValue('INPUT');
    const { _id, actId } = input;

    console.log('INPUT:');
    console.log(input);

    if (!_id) throw new Error('"_id" field is missing in INPUT!');
    if (!actId) throw new Error('"actId" field is missing in INPUT!');

    const crawler = await crawlers.getCrawlerSettings({
        crawlerId: actId,
    });

    if (!crawler) throw new Error('Crawler not found!');

    console.log('Crawler:');
    console.log(crawler);

    const store = await keyValueStores.getOrCreateStore({
        storeName: `crawler-timeline--crawler.customId.replace(/\W+/g, '-')`,
    });

    console.log('Store:');
    console.log(store);

    const result = await crawlers.getExecutionResults({
        executionId: _id,
    });

    console.log('Result:');
    console.log(result);

    if (!result || !result.items || !result.items.length) throw new Error('Result is empty!');
    if (result.items.length !== 1) throw new Error('Result must contain exactly one page!');

    const pageFunctionResult = result.items[0].pageFunctionResult;

    if (!_.isObject(pageFunctionResult)) throw new Error('PageFunction result must be object!');
    if (!_.keys(pageFunctionResult).length) throw new Error('PageFunction is empty!');

    console.log('Page function result:');
    console.log(pageFunctionResult);

    const record = await keyValueStores.getRecord({
        key: 'timeline.json',
        storeId: store.id,
    });

    const timeline = record
        ? record.body
        : [['Date'].concat(_.keys(pageFunctionResult))];

    pageFunctionResult['Date'] = new Date(result.items[0].pageFunctionFinishedAt);

    console.log('Timeline:');
    console.log(timeline);

    timeline.push(timeline[0].map(key => pageFunctionResult[key]));

    console.log('Updated timeline:');
    console.log(timeline);

    await keyValueStores.putRecord({
        key: 'timeline.json',
        contentType: 'application/json',
        body: JSON.stringify(timeline),
        storeId: store.id,
    });

    await keyValueStores.putRecord({
        key: 'timeline.csv',
        contentType: 'application/vnd.ms-excel',
        body: toCSV(timeline),
        storeId: store.id,
    });

    console.log('Done!');
});