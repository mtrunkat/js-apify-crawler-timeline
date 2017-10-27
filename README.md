# Apify Crawler Timeline

This act creates a timeline spreadsheet from crawler results. Main usecase is to create a spreadsheet containing changes of some web page in time.

Crawler has to satisfy:

* Returns exactly one page
* Page function result for that page is simple object

For example if output of your crawler is ...

```json
{
   "someString": "something",
   "someNumber": 123.456
}
```

... and you set this act as finish webhook of that crawler then it creates a key-value store with the name of your crawler and generates following table there in `json` and `csv` formats:

| Date       | 5.6.2017 22:00:00       | 5.6.2017 23:00:00 | 6.6.2017 00:00:00 |
|------------|-------------------------|-------------------|-------------------|
| someString | some value at that date | some other value  | some other value  |
| someNumber | 123.4                   | 42                | 1                 |

On each run of your crawler the table gets updated. 

Webhook to execute this act from crawler is following url: `https://api.apify.com/v2/acts/mtrunkat~crawler-timeline/runs?token=[YOUR_API_TOKEN]`
