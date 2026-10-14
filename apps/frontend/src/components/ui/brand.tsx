import Image from "next/image";
import styles from "./brand.module.css";

export function Brand() {
  return (
    <Image
      src="/brand/retailor-lockup.svg"
      width={483}
      height={128}
      alt="Retailor"
      loading="eager"
      className={styles.brand}
      unoptimized
    />
  );
}
