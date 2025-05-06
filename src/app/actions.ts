"use server";

async function handleGenerateEmbeddings() {
  const res = await fetch("http://localhost:3000/api/generateEmbeddings", {
    method: "POST",
  });

  const data = await res.json();

  console.log(data);
}

export { handleGenerateEmbeddings };
