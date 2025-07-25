import { registerBidder } from "../src/adapters/bidderFactory.js";
import { getStorageManager } from "../src/storageManager.js";
import { BANNER } from "../src/mediaTypes.js";
import {
  generateUUID,
  getParameterByName,
  isNumber,
  logError,
  logInfo,
} from "../src/utils.js";
import { getBoundingClientRect } from "../libraries/boundingClientRect/boundingClientRect.js";
import { hasPurpose1Consent } from "../src/utils/gdpr.js";
import { sendBeacon } from "../src/ajax.js";
import { isAutoplayEnabled } from "../libraries/autoplayDetection/autoplay.js";

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

// ------------------------------------
const BIDDER_CODE = "cwire";
const CWID_KEY = "cw_cwid";

export const BID_ENDPOINT = "https://prebid.cwi.re/v1/bid";
export const EVENT_ENDPOINT = "https://prebid.cwi.re/v1/event";
export const GVL_ID = 1081;

/**
 * Allows limiting ad impressions per site render. Unique per prebid instance ID.
 */
export const pageViewId = generateUUID();

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Retrieve dimensions and CSS max height/width from a given slot and attach the properties to the bidRequest.
 * @param bid
 * @returns {*&{cwExt: {dimensions: {width: number, height: number}, style: {maxWidth: number, maxHeight: number}}}}
 */
function slotDimensions(bid) {
  const adUnitCode = bid.adUnitCode;
  const slotEl = document.getElementById(adUnitCode);

  if (slotEl) {
    logInfo(`Slot element found: ${adUnitCode}`);
    const { width: slotW, height: slotH } = getBoundingClientRect(slotEl);
    const cssMaxW = slotEl.style?.maxWidth;
    const cssMaxH = slotEl.style?.maxHeight;
    logInfo(`Slot dimensions (w/h): ${slotW} / ${slotH}`);
    logInfo(`Slot Styles (maxW/maxH): ${cssMaxW} / ${cssMaxH}`);

    bid = {
      ...bid,
      cwExt: {
        dimensions: {
          width: slotW,
          height: slotH,
        },
        style: {
          ...(cssMaxW && {
            maxWidth: cssMaxW,
          }),
          ...(cssMaxH && {
            maxHeight: cssMaxH,
          }),
        },
      },
    };
  }
  return bid;
}

/**
 * Extracts feature flags from a comma-separated url parameter `cwfeatures`.
 *
 * @returns *[]
 */
function getFeatureFlags() {
  const ffParam = getParameterByName("cwfeatures");
  if (ffParam) {
    return ffParam.split(",");
  }
  return [];
}

function getRefGroups() {
  const groups = getParameterByName("cwgroups");
  if (groups) {
    return groups.split(",");
  }
  return [];
}

function getBidFloor(bid) {
  if (typeof bid.getFloor !== "function") {
    return {};
  }

  const floor = bid.getFloor({
    currency: "USD",
    mediaType: "*",
    size: "*",
  });

  return floor;
}

/**
 * Returns the downlink speed of the connection in Mbps or an empty string if not available.
 */
function getConnectionDownLink(nav) {
  return nav && nav.connection && nav.connection.downlink >= 0
    ? nav.connection.downlink.toString()
    : "";
}

/**
 * Reads the CWID from local storage.
 */
function getCwid() {
  return storage.localStorageIsEnabled()
    ? storage.getDataFromLocalStorage(CWID_KEY)
    : null;
}

function hasCwid() {
  return (
    storage.localStorageIsEnabled() && storage.getDataFromLocalStorage(CWID_KEY)
  );
}

/**
 * Store the CWID to local storage.
 */
function updateCwid(cwid) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(CWID_KEY, cwid);
  } else {
    logInfo(`Could not set CWID ${cwid} in localstorage`);
  }
}

/**
 * Extract and collect cwire specific extensions.
 */
function getCwExtension() {
  const cwId = getCwid();
  const cwCreative = getParameterByName("cwcreative");
  const cwGroups = getRefGroups();
  const cwFeatures = getFeatureFlags();
  // Enable debug flag by passing ?cwdebug=true as url parameter.
  // Note: pbjs_debug=true enables it on prebid level
  // More info: https://docs.prebid.org/troubleshooting/troubleshooting-guide.html#turn-on-prebidjs-debug-messages
  const debug = getParameterByName("cwdebug");

  return {
    ...(cwId && {
      cwid: cwId,
    }),
    ...(cwGroups.length > 0 && {
      refgroups: cwGroups,
    }),
    ...(cwFeatures.length > 0 && {
      featureFlags: cwFeatures,
    }),
    ...(cwCreative && {
      cwcreative: cwCreative,
    }),
    ...(debug && {
      debug: true,
    }),
  };
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!bid.params?.domainId || !isNumber(bid.params.domainId)) {
      logError("domainId not provided or not a number");
      if (!bid.params?.placementId || !isNumber(bid.params.placementId)) {
        logError("placementId not provided or not a number");
        return false;
      }

      if (!bid.params?.pageId || !isNumber(bid.params.pageId)) {
        logError("pageId not provided or not a number");
        return false;
      }
      return true;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests An array of bids.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // There are more fields on the refererInfo object
    const referrer = bidderRequest?.refererInfo?.page;

    // process bid requests
    const processed = validBidRequests
      .map((bid) => slotDimensions(bid))
      .map((bid) => {
        const bidFloor = getBidFloor(bid);
        return {
          ...bid,
          params: {
            ...bid.params,
            floor: bidFloor,
          },
        };
      })
      .map((bid) => {
        const autoplayEnabled = isAutoplayEnabled();
        return {
          ...bid,
          params: {
            ...bid.params,
            autoplay: autoplayEnabled,
          },
        };
      })
      // Flattens the pageId, domainId and placement Id for backwards compatibility.
      .map((bid) => ({
        ...bid,
        pageId: bid.params?.pageId,
        domainId: bid.params?.domainId,
        placementId: bid.params?.placementId,
      }));

    const extensions = getCwExtension();
    const payload = {
      slots: processed,
      httpRef: referrer,
      // TODO: Verify whether the auctionId and the usage of pageViewId make sense.
      pageViewId: pageViewId,
      networkBandwidth: getConnectionDownLink(window.navigator),
      sdk: {
        version: "$prebid.version$",
      },
      ...extensions,
    };
    const payloadString = JSON.stringify(payload);
    return {
      method: "POST",
      url: BID_ENDPOINT,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!hasCwid()) {
      const cwid = serverResponse.body?.cwid;
      if (cwid) {
        updateCwid(cwid);
      }
    }

    // Rename `html` response property to `ad` as used by prebid.
    const bids = serverResponse.body?.bids.map(({ html, ...rest }) => ({
      ...rest,
      ad: html,
    }));
    return bids || [];
  },

  onBidWon: function (bid) {
    logInfo(`Bid won.`);
    const event = {
      type: "BID_WON",
      payload: {
        bid: bid,
      },
    };
    sendBeacon(EVENT_ENDPOINT, JSON.stringify(event));
  },

  onBidderError: function (error, bidderRequest) {
    logInfo(`Bidder error: ${error}`);
    const event = {
      type: "BID_ERROR",
      payload: {
        error: error,
        bidderRequest: bidderRequest,
      },
    };
    sendBeacon(EVENT_ENDPOINT, JSON.stringify(event));
  },

  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    logInfo(
      "Collecting user-syncs: ",
      JSON.stringify({ syncOptions, gdprConsent, uspConsent, serverResponses })
    );

    const syncs = [];
    if (hasPurpose1Consent(gdprConsent) && gdprConsent.consentString) {
      logInfo("GDPR purpose 1 consent was given, adding user-syncs");
      const type = syncOptions.pixelEnabled
        ? "image"
        : null ?? syncOptions.iframeEnabled
          ? "iframe"
          : null;
      if (type) {
        syncs.push({
          type: type,
          url: `https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=${
            gdprConsent.gdprApplies ? 1 : 0
          }&gdpr_consent=${gdprConsent.consentString}`,
        });
      }
    }
    logInfo("Collected user-syncs: ", JSON.stringify({ syncs }));
    return syncs;
  },
};
registerBidder(spec);
