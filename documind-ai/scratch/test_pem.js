
const rawKey = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzKPclCKC+OV6e\\nyWd2imKDvEKJ0cqiepho88OCJsYSbyCYdh8KYyzwy/eiQ+IMQkz/3ryLdQUxBH4o\\n4Eu5A0LMAYlWvYcwz85tvkJSvbY3pwPCpg474kQ+V/w2bR8zwZbISvYubGEqX4kc\\nml1Mbqu1EQSXC4yTlZfpgRuly8Kdu8f4Kq/2+7z8jyNL6Il8vhU/syIJ5OjgrLPQ\\n05wZChR0+PUUIMam6WzjeYogepBu+aOhoLOc4Pc9/xDw8iamxwW8How7Rujc+2VB\\nW/RpObG+AdOMuCo6cwf7h7B7U3svj8KHff8hZhD55jyRdXn0SD1q12wrNFaZG9xr\\nhJt+wfS/AgMBAAECggEAIdx7vY2gZ+OK7SLuwZpNHU3fG5JBpKzcEnYD/Rzb8c78\\nD6S/oCR3cXlzb8E5v4xmZjPQWeE/nnCVcZ9W4Hxrywf9T54Zp5GXF+nOOjot7t3L\\maXt6caNlGTnv9em/o63s1prpgGI6cvNq9DHEnOWU24Ieo3Nv3UWFaV3tsHIoivz\\nGvjIfbgtWH5+HTQrpIp4pBHUM4GeKBqnusjNSEzRCiooK9TQkwSs3MVgMzA9Nfwm\\nj0ia33xIxctHPqmEyPNNr+h1DNVKw/Z0fclaLvOgnO9OMb7bQYfgh2CHE772dGpD\\nosOh867oIt46oQOe9YzX5C/W29b5JnaILMe2Zd12tQKBgQDaSww7sZqEmsTHENfQ\\n3qnfVK4fDeNrXn/97dYDIHRyMwu47jRovXrqTW2l+MfdsAU32XSQv2/I12eos9Uh\\nglw20SB270wzuzzdf7JeeNmAoT0oI2DvsacK4jMKnf5UaDs37vIngo9ES28ZogdJ\\nQqnZWsNtZeZE6apYt4IRYvW3xQKBgQDSG3H7uhDflHCeehM8RsbBOkKQj7C6XsO2\\nPUGH4HP1jHCcwmYCIVUh90XFiNukmCIoWuOEYi1LAM/+k5d8xxSJ4jIIP98QAJQU\\clU16SVezqq1VLaexlzwqX8sLZWWz2rHW7SYLK8kW77vnMkePpDgHAeSr3u+rMtQ\\nBw4O2vn+swKBgQCUFs2ZwYb95rEQCxEeFbBQXfYyAw4BTP6vmaXSQTY+MvsE3jSX\\nydOVGCoGqpuMfVlM5iz59aU0L02XWUiBjxpX5c+MYBLmFWPZMEQlav7DEJ+Yl0ev\\n1GlqLMJLtZtQT9W8wFFvFFd1EWexkAY5YQww9C4YDUUGAy8ZOIT4npXrsQKBgGre\\nqOioqOKAh5QkddpICdrJPoh3fiYeA6CTodxyT6lLaRBjVS2qNLpVIzkptscO1vj9\\n2hJBOdaXsDRGcFx4irrjwh0uF9D06l1IFo2YbHi/2FbpowY50ZZcMKKRATC3ihGj\\nVMW+nMt6mzEX57ipjFliCHwVJHVFQRkQrZbizRw/AoGBAIXbbAIIb8Xg2ekG7uV2\\ncJd9dPUhLRKR3zRoFRDrHOZOWZh6JI0VUsVT1zUtyz2MvlfnPBk74if/lYsYfepK\\nz2E7AkjSIRRIT5uy/4yJOHqKMLXZTpsBzWszhiB9/TDgvYdFa5y6wBQ0LZbkYeXV\\nRzZPymmXRmnriuFLYO7eT0Uo\\n-----END PRIVATE KEY-----\\n";

const header = "-----BEGIN PRIVATE KEY-----";
const footer = "-----END PRIVATE KEY-----";

// Current logic
let processedKey = rawKey.replace(/"/g, "").replace(/\\n/g, "\n").trim();
let body = processedKey.replace(header, "").replace(footer, "").replace(/\s+/g, "");
const fixedKey = `${header}\n${body}\n${footer}`;

console.log("PROCESSED KEY:");
console.log(fixedKey);

// Simplified logic
const simplifiedKey = rawKey.replace(/"/g, "").replace(/\\n/g, "\n").trim();
console.log("\nSIMPLIFIED KEY:");
console.log(simplifiedKey);
