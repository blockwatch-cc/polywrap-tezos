import dotenv from "dotenv"

dotenv.config()

export const Config = {
  TZ_SECRET: process.env.TZ_SECRET_KEY || ""
}