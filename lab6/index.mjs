import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "CourseTable";

export const handler = async (event) => {
  const method = event.requestType;

  switch (method) {
    case "C":
      return await createItem(event);
    case "R":
      return await readItem(event);
    case "U":
      return await updateItem(event);
    case "D":
      return await deleteItem(event);
    case "S":
      return await scanItems(event);
    default:
      return {
        statusCode: 400,
        body: JSON.stringify("Invalid requestType. Use C, R, U, D, or S."),
      };
  }
};
const createItem = async (event) => {
  const { courseCode, teacherName, courseName, month, year, students } = event;

  const param = {
    TableName: TABLE_NAME,
    Item: {
      courseCode,
      teacherName,
      courseName,
      month,
      year,
      ...(students ? { students: new Set(students) } : {}),
    },
  };

  try {
    await docClient.send(new PutCommand(param));
    return {
      statusCode: 201,
      body: JSON.stringify("Item created successfully"),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.name, message: err.message }),
    };
  }
};

const readItem = async (event) => {
  const { courseCode, teacherName } = event;

  const param = {
    TableName: TABLE_NAME,
    Key: { courseCode, teacherName }
  };

  try {
    const result = await docClient.send(new GetCommand(param));
    return {
      statusCode: 200,
      body: JSON.stringify(result.Item || {}),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.name, message: err.message }),
    };
  }
};

const updateItem = async (event) => {
  const { courseCode, teacherName, month, year } = event;

  let updateExpr = [];
  let exprAttrValues = {};
  let exprAttrNames = {};

  if (month !== undefined) {
    updateExpr.push("#M = :m");
    exprAttrNames["#M"] = "month";
    exprAttrValues[":m"] = month;
  }

  if (year !== undefined) {
    updateExpr.push("#Y = :y");
    exprAttrNames["#Y"] = "year";
    exprAttrValues[":y"] = year;
  }

  if (updateExpr.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify("No valid attributes to update"),
    };
  }

  const param = {
    TableName: TABLE_NAME,
    Key: { courseCode, teacherName },
    UpdateExpression: `SET ${updateExpr.join(", ")}`,
    ExpressionAttributeNames: exprAttrNames,
    ExpressionAttributeValues: exprAttrValues,
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await docClient.send(new UpdateCommand(param));
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.name, message: err.message }),
    };
  }
};

const deleteItem = async (event) => {
  const { courseCode, teacherName } = event;

  const param = {
    TableName: TABLE_NAME,
    Key: { courseCode, teacherName }
  };

  try {
    await docClient.send(new DeleteCommand(param));
    return {
      statusCode: 200,
      body: JSON.stringify("Item deleted successfully"),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.name, message: err.message }),
    };
  }
};

const scanItems = async (event) => {
  const { month, year } = event;

  let filterExpr = [];
  let exprAttrValues = {};

  if (month !== undefined) {
    filterExpr.push("#M = :m");
    exprAttrValues[":m"] = month;
  }

  if (year !== undefined) {
    filterExpr.push("#Y = :y");
    exprAttrValues[":y"] = year;
  }

  const param = {
    TableName: TABLE_NAME,
    ...(filterExpr.length > 0 && {
      FilterExpression: filterExpr.join(" AND "),
      ExpressionAttributeNames: { "#M": "month", "#Y": "year" },
      ExpressionAttributeValues: exprAttrValues,
    }),
  };

  try {
    const result = await docClient.send(new ScanCommand(param));
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.name, message: err.message }),
    };
  }
};