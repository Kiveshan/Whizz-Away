import {
  getAllTrucks,
  getTruckById,
  createTruck,
  updateTruck,
  deleteTruckDocument,
  deleteTruck,
} from "../../models/manage/truckModel.js";
import { s3ClientTrucks } from "../../utils/s3Config.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getAllTrucksHandler = async (req, res) => {
  try {
    console.log("Fetching all trucks");
    const trucks = await getAllTrucks();
    res.json(trucks);
  } catch (err) {
    console.error("Error fetching trucks:", err);
    res.status(500).json({ error: "Failed to fetch trucks" });
  }
};

const getTruckByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching truck ID ${id}`);
    const result = await getTruckById(id);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    let truck = result.data;

    const extractKeyFromUrl = (url) => {
      if (!url) return null;
      try {
        return decodeURIComponent(new URL(url).pathname.substring(1));
      } catch {
        return url;
      }
    };

    const signedUrls = await Promise.all(
      [truck.document_url1, truck.document_url2, truck.document_url3].map(
        async (url) => {
          if (!url) return null;
          const key = extractKeyFromUrl(url);
          const command = new GetObjectCommand({
            Bucket: process.env.Trucks_AWS_BUCKET_NAME,
            Key: key,
          });
          return await getSignedUrl(s3ClientTrucks, command, {
            expiresIn: 3600,
          });
        }
      )
    );

    truck.document_url1 = signedUrls[0];
    truck.document_url2 = signedUrls[1];
    truck.document_url3 = signedUrls[2];

    res.json(truck);
  } catch (err) {
    console.error("Error fetching truck details:", err);
    res.status(500).json({ error: "Failed to fetch truck details" });
  }
};

const createTruckHandler = async (req, res) => {
  try {
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
    } = req.body;

    const fileKeys = (req.files || []).map((file) => file.key);
    console.log("Creating truck with data:", req.body, "Files:", fileKeys);

    const newTruck = await createTruck(
      {
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
      },
      fileKeys
    );
    res.status(201).json(newTruck);
  } catch (err) {
    console.error("Error creating truck:", err);
    res.status(500).json({ error: "Failed to create truck" });
  }
};

const updateTruckHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      truckregnum,
      trailersize,
      truckpurchasedate,
      year,
      model,
      purchase_price,
      current_evaluation,
      vin_num,
      is_subcontractor,
    } = req.body;

    const newDocKeys = (req.files || []).map((file) => file.key);
    console.log(`Updating truck ID ${id}, New files:`, newDocKeys);

    const result = await updateTruck(
      id,
      {
        truckregnum,
        trailersize,
        truckpurchasedate,
        year,
        model,
        purchase_price,
        current_evaluation,
        vin_num,
        is_subcontractor,
      },
      newDocKeys
    );
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error("Error updating truck:", err);
    res.status(500).json({ error: "Failed to update truck" });
  }
};

const deleteTruckDocumentHandler = async (req, res) => {
  try {
    const { truckId, url } = req.body;
    if (!truckId || !url) {
      return res
        .status(400)
        .json({ message: "Missing truck ID or document URL" });
    }

    console.log(`Deleting document for truck ID ${truckId}`);
    let s3Key;
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1));
    } catch {
      s3Key = url;
    }

    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await s3ClientTrucks.send(
      new DeleteObjectCommand({
        Bucket: process.env.Trucks_AWS_BUCKET_NAME,
        Key: s3Key,
      })
    );

    const result = await deleteTruckDocument(truckId, s3Key);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json({ message: result.message });
  } catch (error) {
    console.error("Failed to delete truck document:", error);
    res.status(500).json({ message: "Server error during document deletion" });
  }
};

const deleteTruckHandler = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting truck ID ${id}`);
    const result = await deleteTruck(id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json({ message: result.message });
  } catch (err) {
    console.error(`Error deleting truck ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete truck" });
  }
};

export {
  getAllTrucksHandler,
  getTruckByIdHandler,
  createTruckHandler,
  updateTruckHandler,
  deleteTruckDocumentHandler,
  deleteTruckHandler,
};
