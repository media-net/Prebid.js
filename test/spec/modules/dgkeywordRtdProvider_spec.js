import * as dgRtd from 'modules/dgkeywordRtdProvider.js';
import { cloneDeep } from 'lodash';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';

const DG_GET_KEYWORDS_TIMEOUT = 1950;
const IGNORE_SET_ORTB2 = true;
const DEF_CONFIG = {
  name: 'dgkeyword',
  waitForIt: true,
  params: {
    timeout: DG_GET_KEYWORDS_TIMEOUT,
  },
};
const DUMMY_RESPONSE_HEADER = { 'Content-Type': 'application/json' };
const DUMMY_RESPONSE = { s: ['s1', 's2'], t: ['t1', 't2'] };
const SUCCESS_RESULT = { opeaud: ['s1', 's2'], opectx: ['t1', 't2'] };
const SUCCESS_ORTB2 = {
  ortb2: {
    site: { keywords: SUCCESS_RESULT },
    user: { keywords: SUCCESS_RESULT },
  },
};

describe('Digital Garage Keyword Module', function () {
  it('should init and return always true', function () {
    expect(dgRtd.dgkeywordSubmodule.init()).to.equal(true);
  });

  describe('dgkeyword target test', function () {
    it('should have no target', function () {
      const adUnits_no_target = [
        {
          code: 'code1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999999,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999998,
                dgkeyword: false,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999997,
              },
            },
          ],
        },
        {
          code: 'code2',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999996,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999995,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999994,
              },
            },
          ],
        },
      ];
      expect(dgRtd.getTargetBidderOfDgKeywords(adUnits_no_target)).an('array')
        .that.is.empty;
    });
    it('convertKeywordsToString method unit test', function () {
      const keywordsTest = [
        { keywords: { param1: 'keywords1' }, result: 'param1=keywords1' },
        { keywords: { param1: 'keywords1', param2: 'keywords2' }, result: 'param1=keywords1,param2=keywords2' },
        { keywords: { p1: 'k1', p2: 'k2', p: 'k' }, result: 'p1=k1,p2=k2,p=k' },
        { keywords: { p1: 'k1', p2: 'k2', p: ['k'] }, result: 'p1=k1,p2=k2,p=k' },
        { keywords: { p1: 'k1', p2: ['k21', 'k22'], p: ['k'] }, result: 'p1=k1,p2=k21,p2=k22,p=k' },
        { keywords: { p1: ['k11', 'k12', 'k13'], p2: ['k21', 'k22'], p: ['k'] }, result: 'p1=k11,p1=k12,p1=k13,p2=k21,p2=k22,p=k' },
        { keywords: { p1: [], p2: ['', ''], p: [''] }, result: 'p1,p2,p' },
        { keywords: { p1: 1, p2: [1, 'k2'], p: '' }, result: 'p1,p2=k2,p' },
        { keywords: { p1: ['k1', 2, 'k3'], p2: [1, 2], p: 3 }, result: 'p1=k1,p1=k3,p2,p' },
      ];
      for (const test of keywordsTest) {
        expect(dgRtd.convertKeywordsToString(test.keywords)).equal(test.result);
      }
    })
    it('should have targets', function () {
      const adUnits_targets = [
        {
          code: 'code1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999999,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999998,
                dgkeyword: true,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999997,
                dgkeyword: false,
              },
            },
          ],
        },
        {
          code: 'code2',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999996,
                dgkeyword: true,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999995,
                dgkeyword: 'aa',
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999994,
                dgkeyword: true,
              },
            },
          ],
        },
      ];
      const targets = dgRtd.getTargetBidderOfDgKeywords(adUnits_targets);
      expect(targets[0].bidder).to.be.equal('dg2');
      expect(targets[0].params.placementId).to.be.equal(99999998);
      expect(targets[0].params.dgkeyword).to.be.an('undefined');
      expect(targets[1].bidder).to.be.equal('dg');
      expect(targets[1].params.placementId).to.be.equal(99999996);
      expect(targets[1].params.dgkeyword).to.be.an('undefined');
      expect(targets[2].bidder).to.be.equal('dg3');
      expect(targets[2].params.placementId).to.be.equal(99999994);
      expect(targets[2].params.dgkeyword).to.be.an('undefined');
    });
  });

  describe('get profile.', function () {
    const AD_UNITS = [
      {
        code: 'code1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bids: [
          {
            bidder: 'dg',
            params: {
              placementId: 99999999,
            },
          },
          {
            bidder: 'dg2',
            params: {
              placementId: 99999998,
              dgkeyword: true,
            },
          },
          {
            bidder: 'dg3',
            params: {
              placementId: 99999997,
              dgkeyword: false,
            },
          },
        ],
      },
      {
        code: 'code2',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bids: [
          {
            bidder: 'dg',
            params: {
              placementId: 99999996,
              dgkeyword: true,
            },
          },
          {
            bidder: 'dg2',
            params: {
              placementId: 99999995,
              dgkeyword: 'aa',
            },
          },
          {
            bidder: 'dg3',
            params: {
              placementId: 99999994,
            },
          },
        ],
      },
    ];
    it('should get profiles error(404).', function (done) {
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      const moduleConfig = cloneDeep(DEF_CONFIG);
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].params.ortb2Imp).to.be.an('undefined');
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].params.ortb2Imp).to.be.an('undefined');
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].params.ortb2Imp).to.be.an('undefined');

          expect(pbjs.getBidderConfig()).to.be.deep.equal({});

          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(404);
    });
    it('should get profiles timeout.', function (done) {
      const clock = sinon.useFakeTimers();
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      const moduleConfig = cloneDeep(DEF_CONFIG);
      moduleConfig.params.timeout = 10;
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].params.ortb2Imp).to.be.an('undefined');
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].params.ortb2Imp).to.be.an('undefined');
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].params.ortb2Imp).to.be.an('undefined');

          expect(pbjs.getBidderConfig()).to.be.deep.equal({});

          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      if (request) {
        clock.tick(50);
        if (request) {
          request.respond(
            200,
            DUMMY_RESPONSE_HEADER,
            JSON.stringify(DUMMY_RESPONSE)
          );
        }
      }
      clock.restore();
    });
    it('should get profiles ok(200).', function (done) {
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      if (IGNORE_SET_ORTB2) {
        pbjs._ignoreSetOrtb2 = true;
      }
      const moduleConfig = cloneDeep(DEF_CONFIG);
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].ortb2Imp.ext.data.keywords).to.be.deep.equal(dgRtd.convertKeywordsToString(SUCCESS_RESULT));
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].ortb2Imp.ext.data.keywords).to.be.deep.equal(dgRtd.convertKeywordsToString(SUCCESS_RESULT));
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].ortb2Imp).to.be.an('undefined');

          if (!IGNORE_SET_ORTB2) {
            expect(pbjs.getBidderConfig()).to.be.deep.equal({
              dg2: SUCCESS_ORTB2,
              dg: SUCCESS_ORTB2,
            });
          }
          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(
        200,
        DUMMY_RESPONSE_HEADER,
        JSON.stringify(DUMMY_RESPONSE)
      );
    });
    it('change url.', function (done) {
      const dummyUrl = 'https://www.test.com/test'
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      if (IGNORE_SET_ORTB2) {
        pbjs._ignoreSetOrtb2 = true;
      }
      const moduleConfig = cloneDeep(DEF_CONFIG);
      moduleConfig.params.url = dummyUrl;
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          const url = dgRtd.getProfileApiUrl(dummyUrl);
          expect(url.indexOf('?fpid=') === -1).to.equal(true);
          expect(url).to.equal(server.requests[0].url);
          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(
        200,
        DUMMY_RESPONSE_HEADER,
        JSON.stringify(DUMMY_RESPONSE)
      );
    });
    it('add fpid stored in local strage.', function (done) {
      const uuid = 'uuid_abcdefghijklmnopqrstuvwxyz';
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      if (IGNORE_SET_ORTB2) {
        pbjs._ignoreSetOrtb2 = true;
      }
      const moduleConfig = cloneDeep(DEF_CONFIG);
      window.localStorage.setItem('ope_fpid', uuid);
      moduleConfig.params.enableReadFpid = true;
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          const url = dgRtd.getProfileApiUrl(null, moduleConfig.params.enableReadFpid);
          expect(url.indexOf(uuid) > 0).to.equal(true);
          expect(url).to.equal(server.requests[0].url);
          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(
        200,
        DUMMY_RESPONSE_HEADER,
        JSON.stringify(DUMMY_RESPONSE)
      );
    });
    it('disable fpid stored in local strage.', function (done) {
      const uuid = 'uuid_abcdefghijklmnopqrstuvwxyz';
      const pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      if (IGNORE_SET_ORTB2) {
        pbjs._ignoreSetOrtb2 = true;
      }
      const moduleConfig = cloneDeep(DEF_CONFIG);
      window.localStorage.setItem('ope_fpid', uuid);
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          const url = dgRtd.getProfileApiUrl(null);
          expect(url.indexOf(uuid) > 0).to.equal(false);
          expect(url).to.equal(server.requests[0].url);
          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(
        200,
        DUMMY_RESPONSE_HEADER,
        JSON.stringify(DUMMY_RESPONSE)
      );
    });
  });
});
