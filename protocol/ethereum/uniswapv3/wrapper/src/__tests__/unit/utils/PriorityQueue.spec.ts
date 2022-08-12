import { PriorityQueue } from "../../../utils/PriorityQueue";
import { BigInt } from "@web3api/wasm-as";

const comparator = (a: BigInt, b: BigInt): i32 => a.sub(b).toInt32();
const values: BigInt[] = [
  BigInt.fromUInt16(0),
  BigInt.fromUInt16(2),
  BigInt.fromUInt16(4),
  BigInt.fromUInt16(1),
  BigInt.fromUInt16(3),
];
let pq: PriorityQueue<BigInt>;

describe('Priority Queue', () => {

  beforeEach(() => {
    pq = new PriorityQueue<BigInt>(comparator);
    for (let i = 0; i < values.length; i++) {
      const val: BigInt = BigInt.fromString(values[i].toString());
      pq.insert(val);
    }
  });

  it('removes and returns highest priority item', () => {
    expect(pq.length).toStrictEqual(5);
    const item: BigInt | null = pq.delMax();
    expect(pq.length).toStrictEqual(4);
    expect(item).not.toBeNull();
    expect(item!.toInt32()).toStrictEqual(4);
  });

  it('length', () => {
    expect(pq.length).toStrictEqual(5);
    pq.delMax();
    expect(pq.length).toStrictEqual(4);
  });

  it('isEmpty', () => {
    pq.delMax();
    pq.delMax();
    pq.delMax();
    pq.delMax();
    expect(pq.isEmpty()).toStrictEqual(false);
    pq.delMax();
    expect(pq.isEmpty()).toStrictEqual(true);
  });

  it('toArray', () => {
    const arr: BigInt[] = pq.toArray();
    const expected: BigInt[] = [
      BigInt.fromUInt16(4),
      BigInt.fromUInt16(3),
      BigInt.fromUInt16(2),
      BigInt.fromUInt16(1),
      BigInt.fromUInt16(0),
    ];
    expect(arr).toStrictEqual(expected);
  });

});