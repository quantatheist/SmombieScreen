const fastify = require("fastify")({ logger: true });
const path = require("path");
const fs = require("fs");
const pump = require("pump");
const fastifyStatic = require("@fastify/static");
const fastifyMultipart = require("@fastify/multipart");

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
});

fastify.register(fastifyMultipart, {
    limits: {
        fieldNameSize: 100,  // Increase if needed
        fieldSize: 1024 * 1024 * 10,  // 10MB limit, adjust as necessary
        fields: 10,  // Increase if needed
        fileSize: 1024 * 1024 * 10,  // 10MB limit, adjust as necessary
    },
});

fastify.get("/", function (request, reply) {
    reply.sendFile("index.html");
});

fastify.get("/uploader", function (request, reply) {
    reply.sendFile("uploader.html");
});

// lädt hoch, aber kaputte files
/*fastify.post('/upload', async (request, reply) => {
    const data = await request.file();

    if (!data) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
    }

    const { filename, data: fileData } = data;
    const timestamp = new Date().getTime();
    const newFilename = getUniqueFilename(filename, timestamp);
    const uploadPath = path.join(__dirname, 'public/uploads', newFilename);

    const fileStream = fs.createWriteStream(uploadPath);

    fileData.pipe(fileStream);

    fileStream.on('error', (err) => {
        console.error('Error writing the file:', err);
        reply.code(500).send({ error: 'File upload failed' });
    });

    fileStream.on('finish', () => {
        console.log('File uploaded successfully');
        reply.code(201).send({ message: 'File uploaded successfully' });
    });
});*/

// working
/*fastify.post('/upload', async function (req, reply) {
    console.log("upload");
    // return the first file submitted, regardless the field name
    const data = await req.file()

    // we must consume the file
    // we use pump to manage correctly the streams and wait till the end of the pipe
    const storedFile = fs.createWriteStream('./public/uploads/img-uploaded.png')
    await pump(data.file, storedFile)

    return { upload: 'completed' }
})*/

fastify.post('/upload', async (req, reply) => {
    try {
        // Get the uploaded file and other information from the request
        const data = await req.file();

        if (!data) {
            reply.code(400).send({ error: 'No file uploaded' });
            return;
        }

        // Extract the original filename and create a new unique filename
        const originalFilename = data.filename;
        const timestamp = new Date().getTime();
        const newFilename = getUniqueFilename(originalFilename, timestamp);

        // Specify the directory where you want to store the image
        const uploadDirectory = path.join(__dirname, 'public/uploads', newFilename);

        // Create a write stream to save the uploaded file with the new filename
        const fileStream = fs.createWriteStream(uploadDirectory);

        // Use the 'pump' library to manage the stream and wait until the end of the pipe
        await pump(data.file, fileStream);

        console.log('File uploaded successfully');
        reply.code(201).send({ message: 'File uploaded successfully' });
    } catch (err) {
        console.error('Error:', err);
        reply.code(500).send({ error: 'File upload failed' });
    }
});

fastify.get("/latest", function (request, reply) {
    const files = fs.readdirSync(path.join(__dirname, "public/uploads"));

    if (files.length === 0) {
        reply.code(404).send({ error: "No images found" });
        return;
    }

    // Find the latest image by sorting the file list by modification time
    const latestImage = files
        .map((file) => ({
            filename: file,
            created_at: fs.statSync(path.join(__dirname, "public/uploads", file)).ctime,
        }))
        .sort((a, b) => b.created_at - a.created_at)[0];

    const imagePath = path.join(__dirname, "public/uploads", latestImage.filename);
    const imageUrl = `/uploads/${latestImage.filename}`;

    reply.send({ filename: latestImage.filename, created_at: latestImage.created_at });
});

fastify.get("/fav", function (request, reply) {
    const simpsonsImage = "/uploads/simpsons_haha.jpg"; // Provide the path to the Simpsons image with text

    reply.send({ filename: "simpsons_haha.jpg", created_at: Date.now(), url: simpsonsImage });
});


fastify.listen(process.env.PORT || 3000, "0.0.0.0", (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    fastify.log.info(`server listening on ${address}`);
});

function getUniqueFilename(originalFilename, timestamp) {
    const ext = path.extname(originalFilename);
    const base = path.basename(originalFilename, ext);
    let newFilename = `${base}_${timestamp}${ext}`;
    let i = 2;

    while (fs.existsSync(path.join(__dirname, "public/uploads", newFilename))) {
        newFilename = `${base}_${timestamp}_${i}${ext}`;
        i++;
    }

    return newFilename;
}
