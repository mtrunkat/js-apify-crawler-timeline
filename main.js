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

    const data = input.data
        ? (_.isString(input.data) ? JSON.parse(input.data) : input.data)
        : null;
    const maxRowsPerPage = data ? data.maxRowsPerPage : null;
    const dontAddNewKeys = data ? data.dontAddNewKeys : false;

    const crawler = await crawlers.getCrawlerSettings({
        crawlerId: actId,
    });

    if (!crawler) throw new Error('Crawler not found!');

    console.log('Crawler:');
    console.log(crawler);

    const store = await keyValueStores.getOrCreateStore({
        storeName: `crawler-timeline-${crawler.customId.replace(/\W+/g, '-')}`,
    });

    await Apify.client.setOptions({ storeId: store.id });

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

    const currentPageRecord = await keyValueStores.getRecord({ key: 'currentPage' });
    let currentPage = currentPageRecord ? parseInt(currentPageRecord.body) : 0;

    console.log(`Current page: ${currentPage}`);

    const timelineRecord = await keyValueStores.getRecord({ key: `timeline-page-${currentPage}.json` });
    let timeline;

    if (!timelineRecord) {
        console.log('Initiating timeline object ...');
        timeline = [['Date'].concat(_.keys(pageFunctionResult))];
    } else if (maxRowsPerPage && timelineRecord.body.length >= maxRowsPerPage) {
        console.log('Creating new page ...');
        timeline = [['Date'].concat(_.keys(pageFunctionResult))];
        currentPage++;
    } else {
        console.log('Appending data to previous record ...');
        timeline = timelineRecord.body;
    }

    pageFunctionResult['Date'] = new Date(result.items[0].pageFunctionFinishedAt);

    if (!dontAddNewKeys) {
        const newKeys = _.chain(pageFunctionResult).keys().difference(timeline[0]).value();
        console.log(`Appending new keys: ${newKeys.join(', ')}`)
        if (newKeys.length > 0) timeline[0] = timeline[0].concat(newKeys);
    }

    const newLine = timeline[0].map(key => pageFunctionResult[key] || '');
    timeline.push(newLine);

    await keyValueStores.putRecord({
        key: `timeline-page-${currentPage}.json`,
        contentType: 'application/json',
        body: JSON.stringify(timeline),
    });

    await keyValueStores.putRecord({
        key: `timeline-page-${currentPage}.csv`,
        contentType: 'application/vnd.ms-excel',
        body: toCSV(timeline),
    });

    await keyValueStores.putRecord({
        key: 'currentPage',
        body: currentPage.toString(),
    });

    console.log('Done!');
});