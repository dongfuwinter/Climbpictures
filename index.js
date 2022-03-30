const puppeteer = require("puppeteer-core");
const axios = require('axios')
const findChrome = require("./node_modules/carlo/lib/find_chrome");
const path = require("path");
const fs = require("fs");
(async () => {
  const findChromePath = await findChrome({});
  const executablePath = findChromePath.executablePath;
  // puppeteer.launch实例开启浏览器
  const browser = await puppeteer.launch({
    headless: true,
    timeout: 0,
    executablePath,
    defaultViewport: {
      width: 1519,
      height: 697,
    },
  });
  const parsePage = async (url, description) => {
    const page = await browser.newPage();
    await page.goto(url);
    const resource = await page.evaluate(() => {
      const bqbaAList = document.querySelectorAll(".swiper-wrapper .bqpp a");
      const resource = new Array();
      bqbaAList.forEach((item) => {
        const url = item.querySelector(".bqppdiv1 .bqbppdetail").src;
        resource.push({
          title: item.getAttribute("title"),
          url,
        });
      });
      return resource;
    });
    await page.close()
    if (resource.length) {
      const pattern = /[?？ ,':*]/g
      resource.forEach((item) => {
        let title = item.title
        title = title.slice(0, 15)
        title = title.replace(pattern, '')
        const ext = path.extname(item.url);
        const ws = fs.createWriteStream(`./images/${description}/${title}${ext}`);
        axios.get(item.url, { responseType: 'stream' }).then(res => {
          res.data.pipe(ws)
          res.data.on('close', () => {
            console.log('已下载：' + description + '------' + title);
            ws.close()
          })
        })
      });
    }
  };
  const pageExpression = async (num) => {
    // 打开页面
    const page = (await browser.pages())[0];
    await page.goto(`https://www.fabiaoqing.com/bqb/lists/type/hot/page/${num}.html`);
    const resource = await page.evaluate(() => {
      const bqbaList = document.querySelectorAll(".bqba");
      const resource = new Array();
      bqbaList.forEach((item) => {
        const description = item.querySelector('.header').innerHTML
        resource.push({
          description,
          url: item.href,
        });
      });
      return resource;
    });
    await page.close();
    resource.forEach((item) => {
      fs.mkdir(path.resolve(__dirname, `./images/${item.description}`), (err) => {
        if (err) {
          console.error(err)
          return
        };
        console.log('正在创建目录：images/' + item.description);
      });
      parsePage(item.url, item.description);
    });
  }
  // 只需要该传入的参即可  不要超过 740 否则会有报错  因为网站只有740页可爬
  // 如果启动 30秒没反应 停止重新启动就好
  // 根目录一定要创建 images 文件夹 否则会报错
  pageExpression(1)
})();
