import showdown from "showdown";

const footnotes = require("showdown-footnotes")
export const htmlConverter = new showdown.Converter({ extensions: [footnotes] , tables: true});
