// local storage
// TODO: 중복된 이름이 파일 목록에 이미 존재하면 (1), (2), ... 과 같이 파일 이름에 번호를 추가하여 목록에 추가
document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const fileList = event.target.files;
    const objectList = document.getElementById("objectList");
    const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

    for (let i = 0; i < fileList.length; i++) {
      let fileName = fileList[i].name;
      if (existingNames[fileName]) {
        let count = existingNames[fileName];
        fileName = `${fileName} (${count})`;
        existingNames[fileList[i].name] = count + 1;
      } else {
        existingNames[fileList[i].name] = 1;
      }

      const listItem = document.createElement("li");
      listItem.textContent = fileName;
      objectList.appendChild(listItem);

      // Save file to local storage
      const reader = new FileReader();
      reader.onload = function (e) {
        localStorage.setItem(fileName, e.target.result);
      };
      reader.readAsDataURL(fileList[i]);
    }

    localStorage.setItem("fileNames", JSON.stringify(existingNames));
  });

// Load files from local storage on page load
window.addEventListener("load", function () {
  const objectList = document.getElementById("objectList");
  const existingNames = JSON.parse(localStorage.getItem("fileNames")) || {};

  for (const fileName in existingNames) {
    const listItem = document.createElement("li");
    listItem.textContent = fileName;
    objectList.appendChild(listItem);
  }
});
