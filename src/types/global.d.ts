import type { Eip1193Provider } from "ethers";

interface Window {
  ethereum?: Eip1193Provider & {
    on?: (event: string, handler: (...args: never[]) => void) => void;
    removeListener?: (event: string, handler: (...args: never[]) => void) => void;
  };
}
