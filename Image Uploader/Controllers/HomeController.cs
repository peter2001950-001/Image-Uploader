using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Image_Uploader.Models;
using Microsoft.AspNetCore.Http;
using System.Net.Http.Headers;
using System.IO;
using System.Net;
using System.Drawing;
using System.Drawing.Imaging;

namespace Image_Uploader.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly string PhotoFolder;
        private readonly string PhotoThumbnailFolder;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
            PhotoFolder =  "photos/";
            PhotoThumbnailFolder = "photos/thumbnails/";
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
        [HttpPost]
        public async Task<IActionResult> Upload(IList<IFormFile> files, string imageIds)
        {
            var errors = false;
            var modelsCount = GetDbModals().Count;
            var result = new List<object>();
            var imageIdArray = imageIds.Split('|');
            if (imageIdArray.Length == files.Count+1)
            {
                for (int i = 0; i < files.Count; i++)
                {
                    var source = files[i];
                    if (source == null || source.Length == 0)
                        return Content("file not selected");

                    if (source.ContentType == "image/png" || source.ContentType == "image/jpeg" || source.ContentType == "image/gif")
                    {
                        using var image = Image.FromStream(source.OpenReadStream());
                        if (image.Width < 9000 && image.Height < 9000)
                        {
                            if (modelsCount < 12)
                            {
                                var guid = "2" + System.Guid.NewGuid().ToString();
                                var newFileName = guid + Path.GetExtension(source.FileName);
                                var photoDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/" + PhotoFolder);
                                if (!Directory.Exists(photoDirectory))
                                {
                                    Directory.CreateDirectory(photoDirectory);
                                }
                                var path = Path.Combine(photoDirectory, newFileName);
                                AddFile(newFileName, guid);

                                using (var stream = new FileStream(path, FileMode.Create))
                                {
                                    await source.CopyToAsync(stream);
                                }
                                using (Image bitmap = Bitmap.FromFile(path))
                                {
                                    var newPhoto = MakeSquarePhoto(new Bitmap(bitmap), 200);
                                    var thumbnailDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/" + PhotoThumbnailFolder);
                                    if (!Directory.Exists(thumbnailDirectory))
                                    {
                                        Directory.CreateDirectory(thumbnailDirectory);
                                    }
                                    var pathThumbnail = Path.Combine(thumbnailDirectory, newFileName);
                                    using (var stream = new FileStream(pathThumbnail, FileMode.Create))
                                    {
                                        newPhoto.Save(stream, ImageFormat.Jpeg);
                                    }
                                    newPhoto.Dispose();
                                    modelsCount++;
                                    result.Add(new { oldId = imageIdArray[i], newId = guid });
                                }
                            }
                            else
                            {
                                return Json(new { status = "MAX" });
                            }
                        }
                        else
                        {
                            errors = true;

                        }
                    }
                    else
                    {
                        errors = true;
                    }
                }
                if (errors)
                {
                    return Json(new { status = "ERR" });
                }
                else
                {
                    return Json(new { status = "OK", items = result });
                }
            }
            return Json(new { status = "ERR" });
        }
        public JsonResult LoadImages()
        {
            var models = GetDbModals().OrderBy(x=>x.ImageOrder);
            var result = new List<object>();
            foreach (var item in models)
            {
                result.Add(new { id = item.ImageGuid, image = PhotoThumbnailFolder + item.ImageName, orgImage = PhotoFolder + item.ImageName});
            }
            return Json(new { items = result, status = "OK" });
        }
        public JsonResult ImageOrderChange(List<string> imageIds)
        {
            var models = GetDbModals();
            for (int i = 1; i <= imageIds.Count; i++)
            {
                models.First(x => x.ImageGuid == imageIds[i - 1]).ImageOrder = i;
            }
            SaveDbModals(models);
            return Json(new { status = "OK" });
        }
        public JsonResult DeleteImage(string imageId)
        {
            var getModels = GetDbModals();
            var imageToDelete = getModels.Where(x => x.ImageGuid == imageId).FirstOrDefault();
            if (imageToDelete != null)
            {
                var pathThumbnail = Path.Combine(
                               Directory.GetCurrentDirectory(), "wwwroot/"+ PhotoThumbnailFolder,
                               imageToDelete.ImageName);
                var path = Path.Combine(
                               Directory.GetCurrentDirectory(), "wwwroot/" + PhotoFolder,
                               imageToDelete.ImageName);
                System.IO.File.Delete(pathThumbnail);
                System.IO.File.Delete(path);
                getModels.Remove(imageToDelete);
                SaveDbModals(getModels);
                return Json(new { status = "OK" });
            }
            return Json(new { status = "ERR" });

        }
        public JsonResult DeleteAll()
        {
            var getModels = GetDbModals();
            foreach (var item in getModels)
            {
                DeleteImage(item.ImageGuid);
            }
            return Json(new { status = "OK" });
        }
        private string GetCSV()
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "dbset.csv");
            if (!System.IO.File.Exists(path))
            {
                System.IO.File.WriteAllText(path, "");
            }
            return path;
        }
        private void AddFile(string path, string guid)
        {
            var models = GetDbModals();
            var index = 1;
            if (models.Count > 0)
            {
                index = models.Last().ImageOrder + 1;
            };
            models.Add(new DbModal()
            {
                ImageOrder = index,
                ImageGuid = guid,
                ImageName = path
            });
            SaveDbModals(models);
        }
        private Bitmap MakeSquarePhoto(Bitmap bmp, int size)
        {
            try
            {
                Bitmap res = new Bitmap(size, size);
                Graphics g = Graphics.FromImage(res);
                g.FillRectangle(new SolidBrush(Color.White), 0, 0, size, size);
                int t = 0, l = 0;
                if (bmp.Height > bmp.Width)
                    t = (bmp.Height - bmp.Width) / 2;
                else
                    l = (bmp.Width - bmp.Height) / 2;
                g.DrawImage(bmp, new Rectangle(0, 0, size, size), new Rectangle(l, t, bmp.Width - l * 2, bmp.Height - t * 2), GraphicsUnit.Pixel);
                return res;
            }
            catch { return null; }
        }
        private List<DbModal> GetDbModals()
        {
            var lines = System.IO.File.ReadAllLines(GetCSV());
            var result = new List<DbModal>();
            foreach (var item in lines)
            {
                var arr = item.Split(',');
                result.Add(new DbModal()
                {
                    ImageOrder = int.Parse(arr[0]),
                    ImageName = arr[1],
                    ImageGuid = arr[2]
                });
            }
            return result;
        }
        private void SaveDbModals(List<DbModal> dbModals)
        {
            var lines = new List<string>();
            for (int i = 0; i < dbModals.Count; i++)
            {
                lines.Add(dbModals[i].ImageOrder + "," + dbModals[i].ImageName +  "," + dbModals[i].ImageGuid);
            }
            System.IO.File.WriteAllLines(GetCSV(), lines);
        }
        private class DbModal
        {
            public int ImageOrder { get; set; }
            public string ImageName { get; set; }
            public string ImageGuid { get; set; }
        }

       
    }
}
