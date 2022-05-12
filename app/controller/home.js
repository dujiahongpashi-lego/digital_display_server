'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = '<html><head><meta charset="utf-8" /><link rel="stylesheet" href="/public/umi.css" /><script>window.routerBase = "/";</script></head><body><div id="root"></div><script src="/public/umi.js"></script></body></html>';
  }
  async data() {
    {
      const ctx = this.ctx;
      const data = await ctx.service.dataService.getData();
      ctx.body = data;
      ctx.status = 200;
    }
  }
}
module.exports = HomeController;
