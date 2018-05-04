import fetch from "isomorphic-fetch";
import VARIABLES from "./Variables";

// TODO Refator
interface IErrorResponses {
    message: string;
    details: Array<{
        message: string,
        property: string
    }>;
}

interface IReplyPayload {
    replyToken: string;
    messages: any;
}

export default class API {

    private endpoint: string;
    private headers: HeadersInit;

    // TODO params
    constructor(channelAccessToken: string) {
        this.endpoint = VARIABLES.ENDPOINT;
        this.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + channelAccessToken
        };
    }

    private get(path: string) {
        const uri: string = this.endpoint + path;
        const payload: RequestInit = { method: "GET", headers: this.headers };
        return fetch(uri, payload);
    }

    private post(path: string, body: IReplyPayload) {
        const uri: string = this.endpoint + path;
        const payload: RequestInit = { method: "POST", headers: this.headers, body: JSON.stringify(body) };
        return fetch(uri, payload);
    }

    private async push(toId: string, message: string) {
        // const m = Connector.createMessages(message);

        // const body = {
        //     to: toId,
        //     messages: m
        // };
        // // console.log("body", body)
        // const res = await this.post("/message/push", body).then<any>();
        // const r: IErrorResponses = res.json().then();
        // if (r.message) {
        //     throw new Error(r.message);
        // }
        // return r;
    }

    public async reply(replyToken: string, message: any) {
        console.log("replyBody:", message);

        const uri: string = "/message/reply";
        const payload: IReplyPayload = {
            replyToken: replyToken,
            messages: message
        };

        const response = await this.post(uri, payload).then<any>();
        const error: IErrorResponses = response.json().then();
        if (error.message) {
            throw new Error(error.message);
        }
    }

    public async getUserProfile(userId: string) {
        const url = "/profile/" + userId;
        // return url
        const res = await this.get(url).then();
        const r = await res.json().then();
        if (r.message) {
            throw new Error(r.message);
        }
        return r;
    }

    private async getMemberIDs() {
        // if (this.conversationType === undefined) {
        //     throw new Error("not room or group");
        // }
        // const url = `/${this.conversationType === "group" ? "group" : this.conversationType === "room" ? "room" : ""}/${this.conversationId}/members/ids`;
        // const res = await this.get(url).then();
        // const r = await res.json().then();
        // if (r.message) {
        //     throw new Error(r.message);
        // }
        // return r;
    }

    private async getMemberRrofile(userId: string) {
        // if (this.conversationType === undefined) {
        //     throw new Error("not room or group");
        // }
        // const url = `/${this.conversationType === "group" ? "group" : this.conversationType === "room" ? "room" : ""}/${this.conversationId}/member/${userId}`;
        // const res = await this.get(url).then();
        // const r = await res.json().then();
        // if (r.message) {
        //     throw new Error(r.message);
        // }
        // return r;
    }

    private async actionLeave(body: any) {
        // console.log("Body:", body);
        // const res = await this.post("/message/reply", body).then<any>();
        // const r: IErrorResponses = res.json().then();
        // if (r.message) {
        //     throw new Error(r.message);
        // }
    }
}




