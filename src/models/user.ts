export class User {

    constructor(private _id: string, private _name: string, private _room: string) {
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get room(): string {
        return this._room;
    }
}