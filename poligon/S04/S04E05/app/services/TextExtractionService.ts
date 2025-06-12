import * as path from "path";
import * as fs from "fs";
import { LLMService, Model } from "../../../../shared/LLMService";

export class TextExtractionService {
  private readonly dataDir: string;
  private readonly llmService: LLMService;
  private readonly outputDir: string;
  private readonly inputDir: string;

  constructor() {
    this.dataDir = path.join(__dirname, "../../data");
    this.inputDir = path.join(this.dataDir, "input");
    this.outputDir = path.join(this.dataDir, "output/text");
    this.llmService = new LLMService(
      "Extract all readable text from the image. Return only the text, without any commentary.",
      Model.GPT4o,
    );

    console.log("\n🤖 Text Extraction Service initialized:");
    console.log("Data directory:", this.dataDir);
    console.log("Input directory:", this.inputDir);
    console.log("Output directory:", this.outputDir);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async extractTextFromImage(imageName: string): Promise<string> {
    console.log("\n📝 Starting text extraction for image:", imageName);

    const imagePath = path.join(this.dataDir, "output/images/pages", imageName);
    console.log("Reading image from:", imagePath);

    const imageBuffer = fs.readFileSync(imagePath);
    console.log("Image read successfully, size:", imageBuffer.length, "bytes");

    const base64Image = imageBuffer.toString("base64");
    const imageUrl = `data:image/png;base64,${base64Image}`;
    console.log(
      "Image converted to base64, length:",
      base64Image.length,
      "characters",
    );

    const prompt =
      "Extract all handwritten text from this image. Return only the text, without any commentary.";
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          { type: "image_url" as const, image_url: { url: imageUrl } },
        ],
      },
    ];

    try {
      console.log("Sending image to LLM service...");
      const text = await this.llmService.send({ messages, model: Model.GPT4o });
      console.log(
        "Received response from LLM service, text length:",
        text.length,
        "characters",
      );

      // Save the extracted text
      const outputPath = path.join(this.outputDir, "extracted_text_image.txt");
      fs.writeFileSync(outputPath, text, "utf-8");
      console.log("Successfully saved extracted text to:", outputPath);

      return text;
    } catch (error) {
      console.error("❌ Error extracting text from image:", imageName);
      console.error("Error details:", error);
      throw error;
    }
  }
}
