import * as fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

/**
 * Copies all contents from the source directory to the destination directory.
 * @param srcDir The path to the source directory.
 * @param destDir The path to the destination directory.
 * @returns A Promise that resolves when all contents have been copied.
 */
export async function copyDirectoryContents(srcDir: string, destDir: string): Promise<void> {
    try {
        // Ensure destination directory exists
        await mkdir(destDir, { recursive: true });

        // Read the contents of the source directory
        const entries = await readdir(srcDir, { withFileTypes: true });

        // Iterate over each entry in the source directory
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);

            if (entry.isDirectory()) {
                // Recursively copy subdirectory
                await copyDirectoryContents(srcPath, destPath);
            } else {
                // Copy file
                await copyFile(srcPath, destPath);
            }
        }
    } catch (err) {
        throw new Error(`Failed to copy directory contents: ${err}`);
    }
}


/**
 * Deletes a directory and its contents, then recreates the directory.
 * @param dirPath The path to the directory to clear and recreate.
 * @returns A Promise that resolves when the directory has been recreated.
 */
export function resetDirectory(dirPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.rm(dirPath, { recursive: true, force: true }, (err) => {
      if (err) {
        return reject(err);
      }
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

/**
 * Creates a JSON file at the specified path with the provided object.
 * @param filePath The path where the JSON file will be created.
 * @param object The object to be written to the JSON file.
 * @returns A Promise that resolves when the file has been successfully written.
 */
export function createJson(filePath: string, object: Object): Promise<void> {
  return new Promise((resolve, reject) => {
    const jsonString = JSON.stringify(object, null, 2); // Pretty print JSON with 2 spaces indentation
    fs.writeFile(filePath, jsonString, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function splitFile(filePath: string, outDir: string, chunkSize: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
    let fileIndex = 0;
    const promises: Promise<void>[] = [];

    fileStream.on('data', (chunk: Buffer) => {
      const chunkFileName = `${outDir}.part${fileIndex}`;
      const writePromise = new Promise<void>((resolve, reject) => {
        fs.writeFile(chunkFileName, chunk, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Saved ${chunkFileName}`);
            resolve();
          }
        });
      });
      promises.push(writePromise);
      fileIndex++;
    });

    fileStream.on('end', () => {
      Promise.all(promises)
        .then(() => {
          console.log('File has been split successfully.');
          resolve(fileIndex);
        })
        .catch((err) => {
          reject(err);
        });
    });

    fileStream.on('error', (err: NodeJS.ErrnoException) => {
      reject(err);
    });
  });
}
