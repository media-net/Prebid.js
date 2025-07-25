import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { spec } from 'modules/nobidBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';

describe('Nobid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('buildRequestsWithFloor', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'getFloor': () => { return { currency: 'USD', floor: 1.00 } },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should FLoor = 1', function () {
      spec.buildRequests(bidRequests, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.a[0].floor).to.equal(1);
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'nobid',
      'params': {
        'siteId': 2
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      delete bid.params;
      bid.params = {
        'siteId': 2
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      delete bid.params;
      bid.params = {
        'siteId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('Request with ORTB2', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const BIDDER_CODE = 'duration';
    const bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}, bidderCode: BIDDER_CODE
    }

    const siteName = 'example';
    const siteDomain = 'page.example.com';
    const sitePage = 'https://page.example.com/here.html';
    const siteRef = 'https://ref.example.com';
    const siteKeywords = 'power tools, drills';
    const siteSearch = 'drill';
    const siteCat = 'IAB2';
    const siteSectionCat = 'IAB2-2';
    const sitePageCat = 'IAB2-12';

    it('ortb2 should exist', function () {
      const ortb2 = {
        site: {
          name: siteName,
          domain: siteDomain,
          cat: [ siteCat ],
          sectioncat: [ siteSectionCat ],
          pagecat: [ sitePageCat ],
          page: sitePage,
          ref: siteRef,
          keywords: siteKeywords,
          search: siteSearch
        }
      };
      const request = spec.buildRequests(bidRequests, {...bidderRequest, ortb2});
      let payload = JSON.parse(request.data);
      payload = JSON.parse(JSON.stringify(payload));
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.ortb2.site.name).to.equal(siteName);
      expect(payload.ortb2.site.domain).to.equal(siteDomain);
      expect(payload.ortb2.site.page).to.equal(sitePage);
      expect(payload.ortb2.site.ref).to.equal(siteRef);
      expect(payload.ortb2.site.keywords).to.equal(siteKeywords);
      expect(payload.ortb2.site.search).to.equal(siteSearch);
      expect(payload.ortb2.site.cat[0]).to.equal(siteCat);
      expect(payload.ortb2.site.sectioncat[0]).to.equal(siteSectionCat);
      expect(payload.ortb2.site.pagecat[0]).to.equal(sitePageCat);
    });
  });

  describe('Request with GPP', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const BIDDER_CODE = 'duration';
    const bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }
    ];

    const GPP = 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN';
    const GPP_SID = [1, 3];

    const bidderRequest = {
      refererInfo: {page: REFERER},
      bidderCode: BIDDER_CODE,
      gppConsent: {gppString: GPP, applicableSections: GPP_SID}
    }

    it('gpp should match', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      let payload = JSON.parse(request.data);
      payload = JSON.parse(JSON.stringify(payload));
      expect(payload.gpp).to.equal(GPP);
      expect(payload.gpp_sid.join(',')).to.equal(GPP_SID.join(','));
    });

    it('gpp should not be set', function () {
      delete bidderRequest.gppConsent.applicableSections;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      let payload = JSON.parse(request.data);
      payload = JSON.parse(JSON.stringify(payload));
      expect(typeof payload.gpp).to.equal('undefined');
      expect(typeof payload.gpp_sid).to.equal('undefined');
    });

    it('gpp ortb2 should match', function () {
      delete bidderRequest.gppConsent;
      bidderRequest.ortb2 = {regs: {gpp: GPP, gpp_sid: GPP_SID}};
      const request = spec.buildRequests(bidRequests, bidderRequest);
      let payload = JSON.parse(request.data);
      payload = JSON.parse(JSON.stringify(payload));
      expect(payload.gpp).to.equal(GPP);
      expect(payload.gpp_sid.join(',')).to.equal(GPP_SID.join(','));
    });
  });

  describe('isDurationBidRequestValid', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const BIDDER_CODE = 'duration';
    const bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}, bidderCode: BIDDER_CODE
    }

    it('should add source and version to the tag', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.pjbdr).to.equal(BIDDER_CODE);
      expect(payload.l).to.exist.and.to.equal(encodeURIComponent(REFERER));
      expect(payload.tt).to.exist;
      expect(payload.a).to.exist;
      expect(payload.t).to.exist;
      expect(payload.tz).to.exist;
      expect(payload.r).to.exist;
      expect(payload.lang).to.exist;
      expect(payload.ref).to.exist;
      expect(payload.gdpr).to.exist;
    });

    it('sends bid request to ad size', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a.length).to.exist.and.to.equal(1);
      expect(payload.a[0].z[0][0]).to.equal(300);
      expect(payload.a[0].z[0][1]).to.equal(250);
    });

    it('sends bid request to div id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].d).to.equal('adunit-code');
    });

    it('sends bid request to site id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].sid).to.equal(2);
      expect(payload.a[0].at).to.equal('banner');
      expect(payload.a[0].params.siteId).to.equal(2);
    });

    it('sends bid request to ad type', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].at).to.equal('banner');
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.contain('ads.servenobid.com/adreq');
      expect(request.method).to.equal('POST');
    });

    it('should add gdpr consent information to the request', function () {
      const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdpr.consentRequired).to.exist.and.to.be.true;
    });

    it('should add gdpr consent information to the request', function () {
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          gdprApplies: false
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.not.exist;
      expect(payload.gdpr.consentRequired).to.exist.and.to.be.false;
    });

    it('should add usp consent information to the request', function () {
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': '1Y-N'
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.usp).to.exist;
      expect(payload.usp).to.exist.and.to.equal('1Y-N');
    });
  });

  describe('isVideoBidRequestValid', function () {
    const bid = {
      bidder: 'nobid',
      params: {
        siteId: 2,
        video: {
          skippable: true,
          playback_methods: ['auto_play_sound_off'],
          position: 'atf',
          mimes: ['video/x-flv', 'video/mp4', 'video/x-ms-wmv', 'application/x-shockwave-flash', 'application/javascript'],
          minduration: 1,
          maxduration: 30,
          frameworks: [1, 2, 3, 4, 5, 6]
        }
      },
      adUnitCode: 'adunit-code',
      sizes: [[640, 480]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        video: {
          context: 'instream'
        }
      }
    };
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        bidder: 'nobid',
        params: {
          siteId: SITE_ID,
          video: {
            skippable: true,
            playback_methods: ['auto_play_sound_off'],
            position: 'atf',
            mimes: ['video/x-flv', 'video/mp4', 'video/x-ms-wmv', 'application/x-shockwave-flash', 'application/javascript'],
            minduration: 1,
            maxduration: 30,
            frameworks: [1, 2, 3, 4, 5, 6]
          }
        },
        adUnitCode: 'adunit-code',
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        }
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should add source and version to the tag', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.pjbdr).to.equal('nobid');
      expect(payload.pbver).to.equal('$prebid.version$');
      expect(payload.l).to.exist.and.to.equal(encodeURIComponent(REFERER));
      expect(payload.a).to.exist;
      expect(payload.t).to.exist;
      expect(payload.tz).to.exist;
      expect(payload.lang).to.exist;
      expect(payload.ref).to.exist;
      expect(payload.a[0].d).to.exist.and.to.equal('adunit-code');
      expect(payload.a[0].at).to.exist.and.to.equal('video');
      expect(payload.a[0].params.video).to.exist;
      expect(payload.a[0].params.video.skippable).to.exist.and.to.equal(true);
      expect(payload.a[0].params.video.playback_methods).to.exist.and.to.contain('auto_play_sound_off');
      expect(payload.a[0].params.video.position).to.exist.and.to.equal('atf');
      expect(payload.a[0].params.video.mimes).to.exist.and.to.contain('video/x-flv');
      expect(payload.a[0].params.video.minduration).to.exist.and.to.equal(1);
      expect(payload.a[0].params.video.maxduration).to.exist.and.to.equal(30);
      expect(payload.a[0].params.video.frameworks[0]).to.exist.and.to.equal(1);
      expect(payload.a[0].params.video.frameworks[1]).to.exist.and.to.equal(2);
      expect(payload.a[0].params.video.frameworks[2]).to.exist.and.to.equal(3);
      expect(payload.a[0].params.video.frameworks[3]).to.exist.and.to.equal(4);
      expect(payload.a[0].params.video.frameworks[4]).to.exist.and.to.equal(5);
      expect(payload.a[0].params.video.frameworks[5]).to.exist.and.to.equal(6);
    });
  });

  describe('isVideoBidRequestValid', function () {
    const bid = {
      bidder: 'nobid',
      params: {
        siteId: 2,
        video: {
          skippable: true,
          playback_methods: ['auto_play_sound_off'],
          position: 'atf',
          mimes: ['video/x-flv', 'video/mp4', 'video/x-ms-wmv', 'application/x-shockwave-flash', 'application/javascript'],
          minduration: 1,
          maxduration: 30,
          frameworks: [1, 2, 3, 4, 5, 6]
        }
      },
      adUnitCode: 'adunit-code',
      sizes: [[640, 480]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    };
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        bidder: 'nobid',
        params: {
          siteId: SITE_ID,
          video: {
            skippable: true,
            playback_methods: ['auto_play_sound_off'],
            position: 'atf',
            mimes: ['video/x-flv', 'video/mp4', 'video/x-ms-wmv', 'application/x-shockwave-flash', 'application/javascript'],
            minduration: 1,
            maxduration: 30,
            frameworks: [1, 2, 3, 4, 5, 6]
          }
        },
        adUnitCode: 'adunit-code',
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'outstream'
          }
        }
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should add source and version to the tag', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.pjbdr).to.equal('nobid');
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.l).to.exist.and.to.equal(encodeURIComponent(REFERER));
      expect(payload.a).to.exist;
      expect(payload.t).to.exist;
      expect(payload.tz).to.exist;
      expect(payload.r).to.exist;
      expect(payload.lang).to.exist;
      expect(payload.ref).to.exist;
      expect(payload.a[0].d).to.exist.and.to.equal('adunit-code');
      expect(payload.a[0].at).to.exist.and.to.equal('video');
      expect(payload.a[0].params.video).to.exist;
      expect(payload.a[0].params.video.skippable).to.exist.and.to.equal(true);
      expect(payload.a[0].params.video.playback_methods).to.exist.and.to.contain('auto_play_sound_off');
      expect(payload.a[0].params.video.position).to.exist.and.to.equal('atf');
      expect(payload.a[0].params.video.mimes).to.exist.and.to.contain('video/x-flv');
      expect(payload.a[0].params.video.minduration).to.exist.and.to.equal(1);
      expect(payload.a[0].params.video.maxduration).to.exist.and.to.equal(30);
      expect(payload.a[0].params.video.frameworks[0]).to.exist.and.to.equal(1);
      expect(payload.a[0].params.video.frameworks[1]).to.exist.and.to.equal(2);
      expect(payload.a[0].params.video.frameworks[2]).to.exist.and.to.equal(3);
      expect(payload.a[0].params.video.frameworks[3]).to.exist.and.to.equal(4);
      expect(payload.a[0].params.video.frameworks[4]).to.exist.and.to.equal(5);
      expect(payload.a[0].params.video.frameworks[5]).to.exist.and.to.equal(6);
    });
  });

  describe('buildRequestsEIDs', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'userIdAsEids': [
          {
            'source': 'criteo.com',
            'uids': [
              {
                'id': 'CRITEO_ID',
                'atype': 1
              }
            ]
          },
          {
            'source': 'id5-sync.com',
            'uids': [
              {
                'id': 'ID5_ID',
                'atype': 1
              }
            ],
            'ext': {
              'linkType': 0
            }
          },
          {
            'source': 'adserver.org',
            'uids': [
              {
                'id': 'TD_ID',
                'atype': 1,
                'ext': {
                  'rtiPartner': 'TDID'
                }
              }
            ]
          }
        ]
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should criteo eid', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.sid).to.exist.and.to.equal(2);
      expect(payload.eids[0].source).to.exist.and.to.equal('criteo.com');
      expect(payload.eids[0].uids[0].id).to.exist.and.to.equal('CRITEO_ID');
      expect(payload.eids[1].source).to.exist.and.to.equal('id5-sync.com');
      expect(payload.eids[1].uids[0].id).to.exist.and.to.equal('ID5_ID');
      expect(payload.eids[2].source).to.exist.and.to.equal('adserver.org');
      expect(payload.eids[2].uids[0].id).to.exist.and.to.equal('TD_ID');
    });
  });

  describe('buildRequests', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should add source and version to the tag', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.l).to.exist.and.to.equal(encodeURIComponent(REFERER));
      expect(payload.tt).to.exist;
      expect(payload.a).to.exist;
      expect(payload.t).to.exist;
      expect(payload.tz).to.exist;
      expect(payload.r).to.exist;
      expect(payload.lang).to.exist;
      expect(payload.ref).to.exist;
      expect(payload.gdpr).to.exist;
    });

    it('sends bid request to ad size', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a.length).to.exist.and.to.equal(1);
      expect(payload.a[0].z[0][0]).to.equal(300);
      expect(payload.a[0].z[0][1]).to.equal(250);
    });

    it('sends bid request to div id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].d).to.equal('adunit-code');
    });

    it('sends bid request to site id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].sid).to.equal(2);
      expect(payload.a[0].at).to.equal('banner');
      expect(payload.a[0].params.siteId).to.equal(2);
    });

    it('sends bid request to ad type', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.a).to.exist;
      expect(payload.a[0].at).to.equal('banner');
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.contain('ads.servenobid.com/adreq');
      expect(request.method).to.equal('POST');
    });

    it('should add gdpr consent information to the request', function () {
      const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdpr.consentRequired).to.exist.and.to.be.true;
    });

    it('should add gdpr consent information to the request', function () {
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          gdprApplies: false
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.not.exist;
      expect(payload.gdpr.consentRequired).to.exist.and.to.be.false;
    });

    it('should add usp consent information to the request', function () {
      const bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': '1Y-N'
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.usp).to.exist;
      expect(payload.usp).to.exist.and.to.equal('1Y-N');
    });
  });

  describe('buildRequestsRefreshCount', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    const bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      refererInfo: {page: REFERER}
    }

    it('should refreshCount = 4', function () {
      nobid.refreshLimit = 2;
      nobid.refreshCount = 0;
      spec.buildRequests(bidRequests, bidderRequest);
      spec.buildRequests(bidRequests, bidderRequest);
      spec.buildRequests(bidRequests, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(nobid.refreshCount).to.equal(3);
      expect(typeof request).to.equal('undefined');
    });
  });

  describe('interpretResponse', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    const response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250
        }
      ]
    };

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          requestId: REQUEST_ID,
          cpm: PRICE_300x250,
          width: 300,
          height: 250,
          creativeId: CREATIVE_ID_300x250,
          dealId: DEAL_ID,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          ad: ADMARKUP_300x250,
          mediaType: 'banner'
        }
      ];

      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      const result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(expectedResponse.length);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].requestId).to.equal(expectedResponse[0].requestId);
      expect(result[0].cpm).to.equal(expectedResponse[0].cpm);
    });

    it('should get correct empty response', function () {
      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250 + '1'
        }]
      }
      const result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(0);
    });

    it('should get correct deal id', function () {
      const expectedResponse = [
        {
          requestId: REQUEST_ID,
          cpm: PRICE_300x250,
          width: 300,
          height: 250,
          creativeId: CREATIVE_ID_300x250,
          dealId: DEAL_ID,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          ad: ADMARKUP_300x250,
          mediaType: 'banner'
        }
      ];

      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      const result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(expectedResponse.length);
      expect(result[0].dealId).to.equal(expectedResponse[0].dealId);
    });
  });

  describe('interpretResponseWithRefreshLimit', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    const REFRESH_LIMIT = 3;
    const response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      rlimit: REFRESH_LIMIT,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250
        }
      ]
    };

    it('should refreshLimit be respected', function () {
      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      const result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(nobid.refreshLimit).to.equal(REFRESH_LIMIT);
    });
  });

  describe('interpretResponseWithMeta', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    const ADOMAINS = ['adomain1', 'adomain2'];
    const response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250,
          meta: {
            advertiserDomains: ADOMAINS
          }
        }
      ]
    };

    it('should meta.advertiserDomains be respected', function () {
      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      const result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result[0].meta.advertiserDomains).to.equal(ADOMAINS);
    });
  });

  describe('buildRequestsWithSupplyChain', function () {
    const SITE_ID = 2;
    const bidRequests = [
      {
        bidder: 'nobid',
        params: {
          siteId: SITE_ID
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        coppa: true,
        ortb2: {
          source: {
            ext: {
              schain: {
                validation: 'strict',
                config: {
                  ver: '1.0',
                  complete: 1,
                  nodes: [
                    {
                      asi: 'indirectseller.com',
                      sid: '00001',
                      name: 'name.com',
                      hp: 1
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ];

    it('schain exist', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.schain).to.exist;
      expect(payload.schain.validation).to.exist.and.to.equal('strict');
      expect(payload.schain.config.ver).to.exist.and.to.equal('1.0');
      expect(payload.schain.config.complete).to.exist.and.to.equal(1);
      expect(payload.schain.config.nodes[0].asi).to.exist.and.to.equal('indirectseller.com');
      expect(payload.schain.config.nodes[0].sid).to.exist.and.to.equal('00001');
      expect(payload.schain.config.nodes[0].name).to.exist.and.to.equal('name.com');
      expect(payload.schain.config.nodes[0].hp).to.exist.and.to.equal(1);
      expect(payload.coppa).to.exist;
      expect(payload.coppa).to.exist.and.to.be.true;
      expect(payload.a).to.be.lengthOf(1);
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponseWithUserLimit', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    const ULIMIT = 1;
    const response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      ublock: ULIMIT,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250
        }
      ]
    };

    it('should ULimit be respected', function () {
      const bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      const bidRequests = [
        {
          'bidder': 'nobid',
          'params': {
            'siteId': 2
          },
          'adUnitCode': 'adunit-code',
          'sizes': [[300, 250]],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        }
      ];
      spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.equal(undefined);
    });
  });

  describe('getUserSyncs', function () {
    const GDPR_CONSENT_STRING = 'GDPR_CONSENT_STRING';
    it('should get correct user sync when iframeEnabled', function () {
      const pixel = spec.getUserSyncs({iframeEnabled: true})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html');
    });

    it('should get correct user sync when iframeEnabled and pixelEnabled', function () {
      const pixel = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html');
    });

    it('should get correct user sync when iframeEnabled', function () {
      const pixel = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true, consentString: GDPR_CONSENT_STRING})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html?gdpr=1&gdpr_consent=' + GDPR_CONSENT_STRING);
    });

    it('should get correct user sync when !iframeEnabled', function () {
      const pixel = spec.getUserSyncs({iframeEnabled: false})
      expect(pixel.length).to.equal(0);
    });

    it('should get correct user sync when !iframeEnabled and pixelEnabled', function () {
      const pixel = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [{body: {syncs: ['sync_url']}}])
      expect(pixel.length).to.equal(1);
      expect(pixel[0].type).to.equal('image');
      expect(pixel[0].url).to.equal('sync_url');
    });

    it('should get correct user sync when !iframeEnabled', function () {
      let pixel = spec.getUserSyncs({})
      expect(pixel.length).to.equal(0);
    });
  });

  describe('onTimeout', function (syncOptions) {
    it('should increment timeoutTotal', function () {
      const timeoutTotal = spec.onTimeout()
      expect(timeoutTotal).to.equal(1);
    });
  });

  describe('onBidWon', function (syncOptions) {
    it('should increment bidWonTotal', function () {
      const bidWonTotal = spec.onBidWon()
      expect(bidWonTotal).to.equal(1);
    });
  });
});
