export class Message {

    constructor(private _username: string, private _text: string, private _createdAtUnixTime: number) {
    }

    get username(): string {
        return this._username;
    }

    get text(): string {
        return this._text;
    }

    get createdAtUnixTime(): number {
        return this._createdAtUnixTime;
    }
}