/*
 * Copyright 2021-2023 mtripg6666tdr
 * 
 * This file is part of mtripg6666tdr/Discord-SimpleMusicBot. 
 * (npm package name: 'discord-music-bot' / repository url: <https://github.com/mtripg6666tdr/Discord-SimpleMusicBot> )
 * 
 * mtripg6666tdr/Discord-SimpleMusicBot is free software: you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the Free Software Foundation, 
 * either version 3 of the License, or (at your option) any later version.
 *
 * mtripg6666tdr/Discord-SimpleMusicBot is distributed in the hope that it will be useful, 
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with mtripg6666tdr/Discord-SimpleMusicBot. 
 * If not, see <https://www.gnu.org/licenses/>.
 */

import type { exportableCustom, UrlStreamInfo } from ".";

import candyget from "candyget";

import { AudioSource } from "./audiosource";
import { padZero } from "../Util";

export class BestdoriS extends AudioSource<string> {
  protected artist = "";
  protected type: "anime"|"normal"|null = null;
  protected lyricist: string;
  protected composer: string;
  protected arranger: string;
  private id: number;

  constructor(){
    super("bestdori");
  }

  async init(url: string, prefetched: exportableBestdori){
    this.url = url;
    await BestdoriApi.setupData();
    this.id = BestdoriApi.getAudioId(url);
    if(!this.id) throw new Error("Invalid streamable url");
    const data = bestdori.allsonginfo[this.id];
    this.title = data.musicTitle[0];
    this.type = data.tag;
    this.thumbnail = BestdoriApi.getThumbnail(this.id, data.jacketImage[0]);
    this.artist = bestdori.allbandinfo[data.bandId].bandName[0];
    if(prefetched){
      this.lengthSeconds = prefetched.length;
      this.lyricist = prefetched.lyricist;
      this.composer = prefetched.composer;
      this.arranger = prefetched.arranger;
    }else{
      const detailed = await BestdoriApi.getDetailedInfo(this.id);
      this.lengthSeconds = Math.floor(detailed.length);
      this.lyricist = detailed.lyricist[0];
      this.composer = detailed.composer[0];
      this.arranger = detailed.arranger[0];
    }

    this.isPrivateSource = true;

    return this;
  }

  async fetch(): Promise<UrlStreamInfo>{
    return {
      type: "url",
      streamType: "mp3",
      url: "https://bestdori.com/assets/jp/sound/bgm" + padZero(this.id.toString(), 3) + "_rip/bgm" + padZero(this.id.toString(), 3) + ".mp3",
    };
  }

  toField(){
    const typeMap = {
      anime: "カバー",
      normal: "アニメ",
    };
    return [
      {
        name: "バンド名",
        value: this.artist,
        inline: false,
      },
      {
        name: "ジャンル",
        value: typeMap[this.type],
      },
      {
        name: "楽曲情報",
        value: "作詞: `" + (this.lyricist ?? "情報なし")
          + "` \r\n作曲: `" + (this.composer ?? "情報なし")
          + "` \r\n編曲: `" + (this.arranger ?? "情報なし") + "`",
        inline: false,
      },
    ];
  }

  npAdditional(){
    return `アーティスト:\`${this.artist}\``;
  }

  exportData(): exportableBestdori{
    return {
      url: this.url,
      length: this.lengthSeconds,
      lyricist: this.lyricist,
      composer: this.composer,
      arranger: this.arranger,
      title: this.title,
    };
  }
}

export type exportableBestdori = exportableCustom & {
  lyricist: string,
  composer: string,
  arranger: string,
};

/**
 * Bestdori ( https://bestdori.com )のAPIラッパ
 */
export abstract class BestdoriApi {
  /**
   * BestdoriのURLからIDを返します。BestdoriのURLでない場合にはnullが返されます。存在チェックは行っていません。
   * @param url BestdoriのURL
   * @returns BestdoriのID
   */
  static getAudioId(url: string): number{
    const match = url.match(/^https?:\/\/bestdori\.com\/info\/songs\/(?<Id>\d+)(\/.*)?$/);
    if(match){
      return Number(match.groups.Id);
    }else{
      return null;
    }
  }

  static async setupData(){
    if(!bestdori.allbandinfo){
      bestdori.allbandinfo = await candyget.json(BestdoriAllBandInfoEndPoint).then(({ body }) => body);
    }
    if(!bestdori.allsonginfo){
      bestdori.allsonginfo = await candyget.json(BestdoriAllSongInfoEndPoint).then(({ body }) => body);
    }
  }

  static getAudioPage(id: number): string{
    return "https://bestdori.com/info/songs/" + id;
  }

  static async getDetailedInfo(id: number): Promise<BestdoriDetailedSongInfo>{
    const apiUrl = `https://bestdori.com/api/songs/${id.toString()}.json`;
    return candyget.json(apiUrl).then(({ body }) => body);
  }

  static getThumbnail(id: number, jacketimage: string){
    return `https://bestdori.com/assets/jp/musicjacket/musicjacket${Math.ceil(id / 10) * 10}_rip/assets-star-forassetbundle-startapp-musicjacket-musicjacket${Math.ceil(id / 10) * 10}-${jacketimage}-jacket.png`;
  }
}

export const BestdoriAllSongInfoEndPoint = "https://bestdori.com/api/songs/all.5.json";
export const BestdoriAllBandInfoEndPoint = "https://bestdori.com/api/bands/all.1.json";
class BestdoriData {
  allsonginfo: BestdoriAllSongInfo = null;
  allbandinfo: BestdoriAllBandInfo = null;
}
export const bestdori = new BestdoriData();
export type BandID = number;
export type SongID = number;

/**
 * APIから返却されるデータの型定義
 * Remarks: https://support.streamable.com/api-documentation
 * VSCode拡張 'Paste JSON as Code' (quicktype.quicktype)により生成 (https://quicktype.io)
 * (一部改変)
 */
export type BestdoriAllSongInfo = {
  [key: number]: {
    tag: "anime"|"normal",
    bandId: BandID,
    jacketImage: [string],
    musicTitle: [string, string, string, string, string],
    publishedAt: [string, string, string, string, string],
    closedAt: [string, string, string, string, string],
    difficulty: { [key in "0"|"1"|"2"|"3"|"4"]: { playLevel: number } },
  },
};
export type BestdoriAllBandInfo = {
  [key: number]: {
    bandName: [string, string, string, string, string],
  },
};
export interface BestdoriDetailedSongInfo {
  bgmId: SongID;
  bgmFile: string;
  tag: Tag;
  bandId: BandID;
  achievements: Achievement[];
  jacketImage: string[];
  seq: number;
  musicTitle: (null | string)[];
  lyricist: (null | string)[];
  composer: (null | string)[];
  arranger: (null | string)[];
  howToGet: (null | string)[];
  publishedAt: (null | string)[];
  closedAt: (null | string)[];
  difficulty: { [key: string]: Difficulty };
  length: number;
  notes: { [key: string]: number };
  bpm: { [key: string]: BPM[] };
}

export interface Achievement {
  musicId: number;
  achievementType: string;
  rewardType: RewardType;
  quantity: number;
  rewardId?: number;
}

export enum RewardType {
  Coin = "coin",
  PracticeTicket = "practice_ticket",
  Star = "star"
}

export interface BPM {
  bpm: number;
  start: number;
  end: number;
}

export interface Difficulty {
  playLevel: number;
  multiLiveScoreMap: { [key: string]: MultiLiveScoreMap };
  notesQuantity: number;
  scoreC: number;
  scoreB: number;
  scoreA: number;
  scoreS: number;
  scoreSS: number;
}

export interface MultiLiveScoreMap {
  musicId: number;
  musicDifficulty: Tag;
  multiLiveDifficultyId: number;
  scoreS: number;
  scoreA: number;
  scoreB: number;
  scoreC: number;
  multiLiveDifficultyType: string;
  scoreSS: number;
}

export enum Tag {
  Easy = "easy",
  Expert = "expert",
  Hard = "hard",
  Normal = "normal"
}
