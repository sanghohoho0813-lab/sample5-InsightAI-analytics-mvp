import { describe, expect, it } from "vitest";
import { KEYS, MAX_UPLOADS, clearAll, findDataset, isValidReport, readList, readUploads, storeUpload } from "@/lib/persist";
import { DemoDataset } from "@/lib/types";
import { makeDataset, makeRows } from "./fixtures";
import { storage } from "./setup";

const upload = (id: string, name = id, days = 10): DemoDataset => makeDataset(makeRows({ days }), { id, name });

describe("readList", () => {
  it("손상된 JSON·배열이 아닌 값·형태가 틀린 항목은 버린다", () => {
    localStorage.setItem(KEYS.reports, "{not json");
    expect(readList(KEYS.reports, isValidReport)).toEqual([]);
    localStorage.setItem(KEYS.reports, JSON.stringify({ id: "x" }));
    expect(readList(KEYS.reports, isValidReport)).toEqual([]);
    localStorage.setItem(KEYS.reports, JSON.stringify([null, 1, { id: "only-id" }]));
    expect(readList(KEYS.reports, isValidReport)).toEqual([]);
  });
});

describe("storeUpload", () => {
  it(`최근 ${MAX_UPLOADS}개까지만 보관한다`, () => {
    for (const id of ["u1", "u2", "u3", "u4"]) expect(storeUpload(upload(id))).toBe(true);
    expect(readUploads().map((d) => d.id)).toEqual(["u4", "u3", "u2"]);
  });

  it("같은 파일(이름·행 수 동일)을 다시 올리면 예전 사본을 대체한다", () => {
    storeUpload(upload("old", "매출.csv"));
    storeUpload(upload("new", "매출.csv"));
    expect(readUploads().map((d) => d.id)).toEqual(["new"]);
  });

  it("저장 공간이 모자라면 오래된 것부터 비우고, 그래도 안 되면 false", () => {
    storeUpload(upload("a"));
    storeUpload(upload("b"));
    const one = JSON.stringify([upload("c")]).length;
    storage.quota = one + 10; // 하나만 들어갈 공간
    expect(storeUpload(upload("c"))).toBe(true);
    expect(readUploads().map((d) => d.id)).toEqual(["c"]);
    storage.quota = 10;
    expect(storeUpload(upload("d", "d", 30))).toBe(false);
  });
});

describe("findDataset / clearAll", () => {
  it("샘플은 코드에서, 업로드는 저장소에서 찾는다", () => {
    storeUpload(upload("upload-1"));
    expect(findDataset("demo-ecommerce")?.name).toBe("이커머스 판매 데이터");
    expect(findDataset("upload-1")?.id).toBe("upload-1");
    expect(findDataset("upload-missing")).toBeNull();
  });

  it("clearAll은 앱 키만 지운다", () => {
    localStorage.setItem(KEYS.history, "[]");
    localStorage.setItem("other.app", "keep");
    clearAll();
    expect(localStorage.getItem(KEYS.history)).toBeNull();
    expect(localStorage.getItem("other.app")).toBe("keep");
  });
});
