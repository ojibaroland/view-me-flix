import { LocalStorageFFSCacheManager } from "kyofuuc/lib/cachemanagers";
import { Database } from "../utils";
const ffs = require("kyofuuc").init({
    _cache: new LocalStorageFFSCacheManager({
        encryptor: Database._encryptor, decryptor: Database._decryptor,
        localStorageImpl: localStorage
    })
    //baseURL: "",
    /*headers: {
        "Origin": "https://soap2day.rs",
        "Access-Control-Allow-Origin": "*"
    }*/
});

export class BaseService {
    
    isTest = false;

    // should not re init, 
    constructor(isTest) {
        this.isTest = !!isTest;
        if (this.transport) return;
        this.transport = ffs; // to use axios simply change to => this.transport = axios;
        ffs.httpInterceptor.registerPreRequest((_, config) => {
            config.headers = config.headers || {};
            //console.log("||||||||||", config.headers);
            //config.headers["Authorization"] = `Bearer Hello}`;
        });
    }

    report(promise, postResolve, postReject) {
        return new Promise((resolve, reject) => {
            promise.then(response => {
                let transformedRespomse = this.buildResponse(response);
                if (postResolve) postResolve(transformedRespomse);
                resolve(transformedRespomse);
            }).catch(error => {
                let transformedError = this.buildError(error);
                if (postReject) postReject(transformedError);
                reject(transformedError);
            });
        });
	}

    buildResponse(response) {
        if (!response.data || !response.data.data) return response;
        response.tdata = response.data.data;
        return response;
    }

    buildError(error) {
        if (!error) error = {};
        error.message = error?.response?.data?.message || error?.response?.message || error?.message || "An error occur please try again later";
        error.errors = error?.response?.data?.errors;

        error.tMessage = error.message;
        if (error.error) error.tMessage = Object.values(error.error)[0];
        return error;
    }

    mapppedRequest(urlMap) {
        return this.report(Promise.all(Object.keys(urlMap).map(urlKey =>
            this.report(this.transport.get(`${window.location.protocol + '//' + window.location.hostname}:3001/ext/json?url=${urlMap[urlKey]}&method=GET`, { mapKey: urlKey, refreshCache: true })))), (responses) => {
                for (const response of responses) {
                    urlMap[response.config.mapKey] = this.shuffleArray(response.config.mapKey === "Popular" 
                        ? response.data.slice(0, 24) 
                        : response.data);
                }
                responses.data = urlMap;
            });
    }

    aggregateListFromSites(urls) {
        return this.report(Promise.all(urls.map(url => this.report(this.transport.get(`${window.location.protocol + '//' + window.location.hostname}:3001/ext/json?url=${url}&method=GET`, { refreshCache: false })))), (responses) => {
            responses.data = this.resultCombiner(responses);
        });
    }

    resultCombiner(responses, randomizer) {
        const result = responses.reduce((acc, response) => { acc = acc.concat(response.data); return acc; }, []);
        if (randomizer) return randomizer(result);
        return result;
    }

    // https://stackoverflow.com/a/12646864/6626422
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

}