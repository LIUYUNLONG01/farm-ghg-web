import type { StandardVersion } from "@/types/ghg";

export interface StandardOption {
  value: StandardVersion;
  label: string;
  description: string;
}

export const standardOptions: StandardOption[] = [
  {
    value: "NYT4243_2022",
    label: "NY/T 4243—2022",
    description: "畜禽养殖场温室气体排放核算方法",
  },
  {
    value: "GBT32151_22_2024",
    label: "GB/T 32151.22—2024",
    description: "温室气体排放核算与报告要求 第22部分：畜禽养殖企业",
  },
];